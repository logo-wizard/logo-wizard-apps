import asyncio
import datetime
import logging
import os
import sys
from concurrent.futures import ThreadPoolExecutor

import aioredis
import diffusers
from arq import create_pool
from arq.connections import RedisSettings
from arq.worker import Worker as ArqWorker
from diffusers import StableDiffusionPipeline

from logo_configs.logging_config import configure_logging

from logo_worker.app_settings import WorkerSettings
from logo_worker.context import GLOBAL_WORKER_CTX
from logo_worker.models.styler.canny import Canny
from logo_worker.models.text_eraser.detector import Detector
from logo_worker.models.text_eraser.eraser import LaMa
from logo_worker.s3_utils import download_erasure_model_weights_from_s3
from logo_worker.tasks.gen import generate_image
from logo_worker.tasks.stylize import stylize_image
from logo_worker.tasks.text_detect import text_detect
from logo_worker.tasks.text_erase import text_erase


LOGGER = logging.getLogger(__name__)


async def startup(ctx):
    ctx['tpe'] = ThreadPoolExecutor(max_workers=min(32, os.cpu_count() * 3 + 4))


async def shutdown(ctx):
    ctx['tpe'].shutdown()


async def main():
    """
    - registers redis pools
    - initializes ML-models
    - starts the worker
    """

    LOGGER.info('starting up')

    app_settings = WorkerSettings()

    configure_logging(app_name='logo_worker')

    redis_misc_settings = app_settings.REDIS_MISC
    GLOBAL_WORKER_CTX.redis_misc_pool = aioredis.ConnectionPool.from_url(
        url='{protocol}://{host}:{port}/{db}'.format(
            protocol='rediss' if redis_misc_settings.SSL else 'redis',
            host=redis_misc_settings.HOST,
            port=redis_misc_settings.PORT,
            db=redis_misc_settings.DB,
        ),
        password=redis_misc_settings.PASSWORD,
        retry_on_timeout=True,
    )

    redis_arq_settings = app_settings.REDIS_ARQ
    redis_arq_pool = await create_pool(RedisSettings(
        host=redis_arq_settings.HOST,
        port=redis_arq_settings.PORT,
        database=redis_arq_settings.DB,
        password=redis_arq_settings.PASSWORD,
        ssl=redis_arq_settings.SSL,
        ssl_ca_certs=redis_arq_settings.CERT_PATH,
        # conn_timeout=60,
    ))

    #
    # Stable Diffusion
    #
    s3_settings = app_settings.S3
    GLOBAL_WORKER_CTX.s3_settings = s3_settings

    LOGGER.info('Going to download weights for models')
    sd_settings = app_settings.SD

    if not sd_settings.MOCK and not sd_settings.USE_DIFFUSERS:
        LOGGER.error('Non-diffusers SD generation is deprecated')
        sys.exit(1)

    GLOBAL_WORKER_CTX.sd_settings = sd_settings
    if sd_settings.MOCK:
        LOGGER.info('Stable Diffusion is going to be mocked, skipping initialization')
    else:
        LOGGER.info('Going to initialize stable diffusion model')

        diffusers.logging.set_verbosity_info()

        LOGGER.info(f'Initializing pipe ({sd_settings.BASE_MODEL_PATH} : {sd_settings.REPO})')

        pipe = StableDiffusionPipeline.from_pretrained(sd_settings.BASE_MODEL_PATH, use_auth_token=sd_settings.HF_TOKEN)
        # if sd_settings.REPO:  # TODO deprecated, remove from settings
        #     pipe.unet.load_attn_procs(sd_settings.REPO, use_auth_token=sd_settings.HF_TOKEN)

        LOGGER.info('Pipe initialized')

        GLOBAL_WORKER_CTX.sd_pipe = pipe

        LOGGER.info('Stable diffusion is initialized')

    #
    # Text Detection
    #
    LOGGER.info('Going to initialize text detection model')
    device = app_settings.TEXT_DETECTOR.DEVICE
    detector = app_settings.TEXT_DETECTOR.DETECTOR
    detector_model = Detector(detector=detector, device=device)
    GLOBAL_WORKER_CTX.text_detector = detector_model
    LOGGER.info('Detection model is initialized')

    #
    # Text Erasure
    #
    LOGGER.info('Going to initialize text erasure model')
    device = app_settings.TEXT_ERASER.DEVICE
    eraser_model_path = app_settings.TEXT_ERASER.MODEL_PATH
    await download_erasure_model_weights_from_s3(
        s3_base_url=s3_settings.HOST,
        s3_bucket=s3_settings.BUCKET,
        filename=eraser_model_path.split('/')[-1],
        force=False,
    )
    eraser_model = LaMa(model_path=eraser_model_path, device=device)
    GLOBAL_WORKER_CTX.text_eraser = eraser_model
    LOGGER.info('Erasure model is initialized')

    #
    # Styler
    #
    if app_settings.STYLER.MOCK:
        LOGGER.info('Styler is going to be mocked, skipping initialization')
        GLOBAL_WORKER_CTX.styler_mock = True
    else:
        LOGGER.info('Going to initialize styler')
        styler = Canny()
        GLOBAL_WORKER_CTX.styler_mock = False
        GLOBAL_WORKER_CTX.styler = styler
        LOGGER.info('Styler is initialized')

    _arq_worker = ArqWorker(
        **{
            'functions': [generate_image, text_detect, text_erase, stylize_image],
            'on_startup': startup,
            'on_shutdown': shutdown,
            'max_jobs': 1,  # TODO multiple concurrent generations seemingly use up all GPU memory
                            #  and the results become just terrible
            'job_timeout': datetime.timedelta(seconds=60 * 30),
            'retry_jobs': True,
            'handle_signals': False,
        },
        redis_pool=redis_arq_pool,
    )
    await _arq_worker.main()


if __name__ == '__main__':
    asyncio.run(main())
