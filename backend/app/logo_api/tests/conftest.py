import asyncio
import os
import logging

import aiobotocore.session
import aiobotocore.client
import aiohttp.test_utils
import aioredis
import pytest
from logo_configs.logging_config import configure_logging

from logo_api.enums import LogoProcessingStatus
from logo_api.models import Logo
from logo_api.redis_model import RedisModelManager
from logo_configs.settings_submodels import RedisSettings, S3Settings, CORSSettings, KeycloakSettings, PostgresSettings, \
    ColorizationSettings

import logo_api.app
from logo_api.app_settings import ApiSettings


pytest_plugins = 'aiohttp.pytest_plugin'


LOGGER = logging.getLogger(__name__)


@pytest.fixture
def first_user_id() -> str:
    return 'first_user_id'


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
def app_settings(redis_misc_settings, s3_settings) -> ApiSettings:
    return ApiSettings(
        APP_ENV='tests',
        REDIS_ARQ=RedisSettings(
            HOST='localhost',
            PORT=6370,
            DB=0,
            PASSWORD='dummy_test_password_123',
            SSL=False,
            CERT_PATH=None,
        ),
        REDIS_MISC=redis_misc_settings,
        S3=s3_settings,
        CORS=CORSSettings(
            ALLOW_ORIGINS=('*',),
            ALLOW_HEADERS=('DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT'),
            ALLOW_METHODS=('Origin', 'X-Requested-With', 'Content-Type', 'Accept'),
            ALLOW_CREDENTIALS=True,
            EXPOSED_ROUTES=('/api/v1/ping',),
        ),
        KEYCLOAK=KeycloakSettings(
            HOST='http://localhost',  # :28080
            REALM='logo',
            CLIENT_ID='logo-backend',
            CLIENT_SECRET_KEY='EdvR8ZBUqKgoZmrairQx5pfIN7GwKfoh',
            CLIENT_PUBLIC_KEY='',
            ADMIN_USERNAME='admin',
            ADMIN_PASSWORD='admin',
        ),
        PG=PostgresSettings(
            HOST='localhost',
            PORT=5433,
            USERNAME='logo_pg_user',
            PASSWORD='logo_pg_pass',
            DB_NAME='logodb',
        ),
        COLORIZATION=ColorizationSettings(
            MOCK=True,
            MODEL_DIR='',
            MODEL_FILENAME='',
        )
    )


@pytest.fixture
def client(aiohttp_client, app_settings) -> aiohttp.test_utils.TestClient:
    app = logo_api.app.create_app(app_settings)
    configure_logging(app_name='logo_api')
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(aiohttp_client(app))


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


@pytest.fixture(autouse=True)
async def prepare_s3_for_tests(s3_client_ctx) -> None:
    async with s3_client_ctx as s3_client:
        await create_s3_bucket(
            s3_client=s3_client,
            bucket_name='s3-logo',
        )
    LOGGER.info('The bucket was created successfully')


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


@pytest.fixture
async def logo_ready(first_user_id, redis_model_manager: RedisModelManager) -> Logo:
    logo = Logo(
        manager=redis_model_manager,
        title='My Test Logo',
        specialization=[],
        palette='',
        style='',
        objects=[],
        is_public=True,
        created_by=first_user_id,
        status=LogoProcessingStatus.ready,
        prompt='',
    )

    await logo.save(ttl=None)

    yield logo

    try:
        await logo.delete()
    except Exception:
        pass
