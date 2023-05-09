import asyncio
import logging
import os
import uuid
from typing import Optional

import aioredis
import cv2
import numpy as np
from PIL.Image import Image

from logo_worker_interface.task_params import GenerateImageTaskParams

from logo_api.enums import LogoProcessingStatus
from logo_api.models import Logo
from logo_api.redis_model import RedisModelManager

from logo_worker.context import GLOBAL_WORKER_CTX
from logo_worker.s3_utils import S3Uploader


LOGGER = logging.getLogger(__name__)


GEN_SAMPLE_FILE_PREFIX = 'sample-'


def actual_blocking_generator(prompt: str) -> list[str]:
    settings = GLOBAL_WORKER_CTX.sd_settings
    FINAL_W, FINAL_H = 512, 512

    outpath = settings.OUTDIR
    os.makedirs(outpath, exist_ok=True)

    if settings.MOCK:
        LOGGER.info('Going to generate a mock image')
        filename = f'{GEN_SAMPLE_FILE_PREFIX}{uuid.uuid4()}.png'
        filepath = os.path.join(outpath, filename)

        noise = np.random.normal(255, 255, (FINAL_W, FINAL_H, 3))
        cv2.imwrite(filepath, noise)
        LOGGER.info(f'Generation completed, results are at "{outpath}"')

        return [filename]

    assert settings.USE_DIFFUSERS, 'Non-diffusers SD generation is deprecated'

    filename = f'{GEN_SAMPLE_FILE_PREFIX}{uuid.uuid4()}.png'
    filepath = os.path.join(outpath, filename)
    pipe = GLOBAL_WORKER_CTX.sd_pipe

    pipe = pipe.to("cuda")

    LOGGER.info('Gonna pipe')
    image: Image = pipe(
        prompt,
        width=settings.W,
        height=settings.H,
        num_inference_steps=settings.STEPS,
        guidance_scale=7.5,
        negative_prompt=settings.NEG_PROMPT,
    ).images[0]
    image = image.resize((FINAL_W, FINAL_H))

    LOGGER.info('Done piping')

    image.save(filepath)

    return [filename]


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
            os.remove(filepath)

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
