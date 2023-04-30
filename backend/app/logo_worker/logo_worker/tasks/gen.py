import asyncio
import logging
import os
import time
import uuid
from contextlib import nullcontext
from typing import Optional, Any

import aioredis
import cv2
import torch
import numpy as np
from einops import rearrange
from PIL import Image
from torch import autocast
from torchvision.utils import make_grid
from tqdm import tqdm, trange

from logo_worker_interface.task_params import GenerateImageTaskParams

from logo_api.enums import LogoProcessingStatus
from logo_api.models import Logo
from logo_api.redis_model import RedisModelManager

from logo_worker.context import GLOBAL_WORKER_CTX
from logo_worker.s3_utils import S3Uploader


LOGGER = logging.getLogger(__name__)


GEN_SAMPLE_FILE_PREFIX = 'sample-'
GEN_GRID_FILE_PREFIX = 'grid-'


def actual_blocking_generator(prompt: str) -> list[str]:
    settings = GLOBAL_WORKER_CTX.sd_settings
    model = GLOBAL_WORKER_CTX.sd_model
    sampler = GLOBAL_WORKER_CTX.sd_sampler
    device = GLOBAL_WORKER_CTX.device

    outpath = settings.OUTDIR

    # sample_path = os.path.join(outpath, "samples")
    # os.makedirs(sample_path, exist_ok=True)
    os.makedirs(outpath, exist_ok=True)
    # base_count = len(os.listdir(sample_path))
    # grid_count = len(os.listdir(outpath)) - 1

    if settings.MOCK:
        LOGGER.info('Going to generate a mock image')
        filename = f'{GEN_SAMPLE_FILE_PREFIX}{uuid.uuid4()}.png'
        filepath = os.path.join(outpath, filename)

        noise = np.random.normal(255, 255, (settings.W, settings.H, 3))
        cv2.imwrite(filepath, noise)
        LOGGER.info(f'Generation completed, results are at "{outpath}"')

        return [filename]

    if settings.USE_DIFFUSERS:
        filename = f'{GEN_SAMPLE_FILE_PREFIX}{uuid.uuid4()}.png'
        filepath = os.path.join(outpath, filename)
        pipe = GLOBAL_WORKER_CTX.sd_pipe

        pipe = pipe.to("cuda")

        LOGGER.info('Gonna pipe')
        image = pipe(
            prompt,
            width=settings.W,
            height=settings.H,
            num_inference_steps=35,
            guidance_scale=7.5,
            negative_prompt='text, inscription, label, words, letters',
        ).images[0]

        LOGGER.info('Done piping')

        image.save(filepath)

        return [filename]

    batch_size = settings.N_SAMPLES
    n_rows = settings.N_ROWS if settings.N_ROWS > 0 else batch_size
    if settings.FROM_FILE:
        raise ValueError('Reading prompt from file is not supported here')
    data = [batch_size * [prompt]]

    start_code = None
    if settings.FIXED_CODE:
        start_code = torch.randn([settings.N_SAMPLES, settings.C, settings.H // settings.F, settings.W // settings.F], device=device)

    precision_scope = autocast if settings.PRECISION == 'autocast' else nullcontext
    with torch.no_grad():  # TODO refactor, change tqdm to just logs
        with precision_scope('cuda'):
            with model.ema_scope():
                tic = time.time()
                all_samples = []
                all_filesnames = []
                for n in trange(settings.N_ITER, desc='Sampling'):
                    for prompts in tqdm(data, desc='data'):
                        uc = None
                        if settings.SCALE != 1.0:
                            uc = model.get_learned_conditioning(batch_size * [''])
                        if isinstance(prompts, tuple):
                            prompts = list(prompts)
                        c = model.get_learned_conditioning(prompts)
                        shape = [settings.C, settings.H // settings.F, settings.W // settings.F]
                        samples_ddim, _ = sampler.sample(
                            S=settings.DDIM_STEPS,
                            conditioning=c,
                            batch_size=settings.N_SAMPLES,
                            shape=shape,
                            verbose=False,
                            unconditional_guidance_scale=settings.SCALE,
                            unconditional_conditioning=uc,
                            eta=settings.DDIM_ETA,
                            x_T=start_code
                        )

                        x_samples_ddim = model.decode_first_stage(samples_ddim)
                        x_samples_ddim = torch.clamp((x_samples_ddim + 1.0) / 2.0, min=0.0, max=1.0)

                        if not settings.SKIP_SAVE:
                            for x_sample in x_samples_ddim:
                                x_sample = 255. * rearrange(x_sample.cpu().numpy(), 'c h w -> h w c')
                                filename = f'{GEN_SAMPLE_FILE_PREFIX}{uuid.uuid4()}.png'
                                filepath = os.path.join(outpath, filename)
                                Image.fromarray(x_sample.astype(np.uint8)).save(filepath)
                                all_filesnames.append(filename)
                                # base_count += 1

                        if not settings.SKIP_GRID:
                            all_samples.append(x_samples_ddim)

                if not settings.SKIP_GRID:
                    # additionally, save as grid
                    grid = torch.stack(all_samples, 0)
                    grid = rearrange(grid, 'n b c h w -> (n b) c h w')
                    grid = make_grid(grid, nrow=n_rows)

                    # to image
                    grid = 255. * rearrange(grid, 'c h w -> h w c').cpu().numpy()
                    filename = f'{GEN_GRID_FILE_PREFIX}{uuid.uuid4()}.png'
                    filepath = os.path.join(outpath, filename)
                    Image.fromarray(grid.astype(np.uint8)).save(filepath)
                    all_filesnames.append(filename)
                    # grid_count += 1

                toc = time.time()

    LOGGER.info(f'Generation completed, results are at "{outpath}"')
    return all_filesnames


async def generate_image(ctx, params: GenerateImageTaskParams) -> None:
    logo_id = params.logo_id
    logo: Optional[Logo] = None

    try:
        redis: aioredis.Redis = aioredis.Redis(connection_pool=GLOBAL_WORKER_CTX.redis_misc_pool)

        rmm = RedisModelManager(redis=redis)
        logo = await Logo.get(manager=rmm, obj_id=logo_id)
        LOGGER.info(f'Going to generate image for prompt {logo.prompt}, ctx={ctx["job_id"]}')
        LOGGER.info('%s gonna block', ctx['job_id'])

        loop = asyncio.get_running_loop()
        filenames = await loop.run_in_executor(ctx['tpe'], actual_blocking_generator, logo.prompt)

        s3_settings = GLOBAL_WORKER_CTX.s3_settings
        LOGGER.info('Going to upload results to s3')
        s3_uploader = S3Uploader(
            s3_host=s3_settings.HOST,
            s3_bucket=s3_settings.BUCKET,
            access_key_id=s3_settings.ACCESS_KEY_ID,
            secret_key=s3_settings.SECRET_KEY,
        )
        for filename in filenames:
            filepath = os.path.join(GLOBAL_WORKER_CTX.sd_settings.OUTDIR, filename)
            await s3_uploader.begin_multipart_upload(from_local_path=filepath, key=filename)
        LOGGER.info('Uploaded results to s3')

        logo.status = LogoProcessingStatus.ready
        filename = filenames[-1]
        logo.s3_key = filename
        logo.link = f'{s3_settings.HOST}/{s3_settings.BUCKET}/{filename}'
        await logo.save()

        LOGGER.info('%s DONE', ctx['job_id'])
    except Exception as ex:
        LOGGER.exception(ex)
        if logo is None:
            LOGGER.exception('Cannot retry task')
        else:
            logo.status = LogoProcessingStatus.failed
            await logo.save()
