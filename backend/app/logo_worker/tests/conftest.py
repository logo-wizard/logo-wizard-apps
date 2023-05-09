import logging
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import aiobotocore.session
import aiobotocore.client
import aioredis
import pytest
import pytest_asyncio

from logo_configs.logging_config import configure_logging
from logo_configs.settings_submodels import (
    RedisSettings,
    S3Settings,
)

from logo_api.enums import LogoProcessingStatus
from logo_api.models import Logo
from logo_api.redis_model import RedisModelManager

from logo_worker.app_settings import (
    WorkerSettings,
    StableDiffusionSettings,
    DetectorSettings,
    EraserSettings,
    StylerSettings,
)
from logo_worker.context import GLOBAL_WORKER_CTX


pytest_plugins = 'pytest_asyncio'


LOGGER = logging.getLogger(__name__)


@pytest.fixture
def first_user_id() -> str:
    return 'first_user_id'


@pytest.fixture
def sd_settings() -> StableDiffusionSettings:
    return StableDiffusionSettings(
        MOCK=True,
        USE_DIFFUSERS=False,
        BASE_MODEL_PATH='stabilityai/stable-diffusion-2', STEPS=30, REPO='', HF_TOKEN='', OUTDIR='./.tmp_test_files',
        SKIP_GRID=True, SKIP_SAVE=False, DDIM_STEPS=10, PLMS=True, LAION400M=False, FIXED_CODE=False, DDIM_ETA=0.0,
        N_ITER=1, H=128, W=128, C=4, F=8, N_SAMPLES=1, N_ROWS=0, SCALE=7.5, FROM_FILE=False,
        CONFIG='/configs/stable-diffusion_v1-inference.yaml', CKPT='/models/model.ckpt', SEED=42, PRECISION='full',
        NEG_PROMPT='',
    )


@pytest.fixture
def s3_settings() -> S3Settings:
    return S3Settings(
        HOST='http://localhost:50000',
        BUCKET='s3-logo',
        ACCESS_KEY_ID='accessKey1',
        SECRET_KEY='verySecretKey1',
    )


@pytest.fixture
def redis_misc_settings() -> RedisSettings:
    return RedisSettings(
        HOST='localhost',
        PORT=6370,
        DB=1,
        PASSWORD='dummy_test_password_123',
        SSL=False,
        CERT_PATH=None,
    )


@pytest.fixture
def app_settings(redis_misc_settings, sd_settings, s3_settings, pg_settings) -> WorkerSettings:
    return WorkerSettings(
        SD=sd_settings,
        TEXT_DETECTOR=DetectorSettings(
            DEVICE='cpu',
            DETECTOR='dbnetpp',
        ),
        TEXT_ERASER=EraserSettings(
            DEVICE='cpu',
            MODEL_PATH='/models/big-lama.pt',
        ),
        STYLER=StylerSettings(
            MOCK=True,
        ),
        REDIS_ARQ=RedisSettings(
            HOST='localhost',
            PORT=6370,
            DB=0,
            PASSWORD=None,
            SSL=False,
            CERT_PATH=None,
        ),
        REDIS_MISC=redis_misc_settings,
        S3=s3_settings,
    )


@pytest.fixture(autouse=True)
def configure_logging_for_tests() -> None:
    configure_logging('logo_worker')


@pytest.fixture
def s3_client_ctx(s3_settings) -> aiobotocore.session.ClientCreatorContext:
    session = aiobotocore.session.get_session()
    return session.create_client(
        service_name='s3',
        aws_access_key_id=s3_settings.ACCESS_KEY_ID,
        aws_secret_access_key=s3_settings.SECRET_KEY,
        endpoint_url=s3_settings.HOST,
    )


async def create_s3_bucket(s3_client: aiobotocore.client.AioBaseClient, bucket_name: str) -> None:
    resp = await s3_client.create_bucket(Bucket=bucket_name, ACL='public-read')
    LOGGER.info(resp)
    resp = await s3_client.put_bucket_cors(
        Bucket=bucket_name,
        CORSConfiguration=dict(
            CORSRules=[
                dict(
                    AllowedMethods=['GET'],
                    AllowedOrigins=['*'],
                )
            ]
        )
    )
    LOGGER.info(resp)


@pytest_asyncio.fixture(autouse=True)
async def prepare_s3_for_tests(s3_client_ctx) -> None:
    async with s3_client_ctx as s3_client:
        await create_s3_bucket(
            s3_client=s3_client,
            bucket_name='s3-logo',
        )
    LOGGER.info('The bucket was created successfully')


@pytest.fixture(autouse=True)
def prepare_global_worker_ctx(
        redis_misc_settings: RedisSettings,
        s3_settings: S3Settings,
        sd_settings: StableDiffusionSettings,
) -> None:
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
    GLOBAL_WORKER_CTX.s3_settings = s3_settings
    GLOBAL_WORKER_CTX.sd_settings = sd_settings
    GLOBAL_WORKER_CTX.text_detector = None
    GLOBAL_WORKER_CTX.text_eraser = None
    GLOBAL_WORKER_CTX.styler_mock = True


@pytest.fixture
def redis_model_manager(redis_misc_settings: RedisSettings) -> RedisModelManager:
    db = redis_misc_settings.DB
    protocol = 'rediss' if redis_misc_settings.SSL else 'redis'
    host = redis_misc_settings.HOST
    port = redis_misc_settings.PORT
    redis_misc_pool = aioredis.ConnectionPool.from_url(
        url=f"{protocol}://{host}:{port}/{db}",
        password=redis_misc_settings.PASSWORD,
    )
    redis = aioredis.Redis(connection_pool=redis_misc_pool)

    rmm = RedisModelManager(redis=redis)

    return rmm


@pytest_asyncio.fixture
async def logo_in_progress(first_user_id, redis_model_manager: RedisModelManager) -> Logo:
    logo = Logo(
        manager=redis_model_manager,
        title='My Test Logo',
        specialization=['Spec_01'],
        palette='Palette_01',
        style='Style_01',
        objects=['obj1', 'obj2'],
        is_public=True,
        created_by=first_user_id,
        status=LogoProcessingStatus.in_progress,
        prompt='My Awesome Logo Prompt',
    )

    await logo.save(ttl=None)

    yield logo

    try:
        await logo.delete()
    except Exception:
        pass


@pytest.fixture
def worker_task_ctx() -> dict[str, Any]:
    return dict(
        job_id=str(uuid.uuid4()),
        tpe=ThreadPoolExecutor(max_workers=min(32, os.cpu_count() * 3 + 4)),
    )
