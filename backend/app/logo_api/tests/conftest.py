import asyncio

import aiohttp.test_utils
import aioredis
import pytest

from logo_api.enums import LogoProcessingStatus
from logo_api.models import Logo
from logo_api.redis_model import RedisModelManager
from logo_configs.settings_submodels import RedisSettings, S3Settings, CORSSettings, KeycloakSettings, PostgresSettings, \
    ColorizationSettings

import logo_api.app
from logo_api.app_settings import ApiSettings


pytest_plugins = 'aiohttp.pytest_plugin'


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
def app_settings(redis_misc_settings) -> ApiSettings:
    return ApiSettings(
        REDIS_ARQ=RedisSettings(
            HOST='localhost',
            PORT=6370,
            DB=0,
            PASSWORD='dummy_test_password_123',
            SSL=False,
            CERT_PATH=None,
        ),
        REDIS_MISC=redis_misc_settings,
        S3=S3Settings(
            HOST='localhost:8001',
            BUCKET='s3-logo',
            ACCESS_KEY_ID='default_access_key_id',
            SECRET_KEY='default_secret_key',
        ),
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
            CLIENT_SECRET_KEY='...',
            CLIENT_PUBLIC_KEY='...',
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
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(aiohttp_client(app))


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
async def logo_ready(redis_model_manager: RedisModelManager) -> Logo:
    logo = Logo(
        manager=redis_model_manager,
        title='My Test Logo',
        specialization=[],
        palette='',
        style='',
        objects=[],
        is_public=True,
        created_by='',
        status=LogoProcessingStatus.ready,
        prompt='',
    )

    await logo.save(ttl=None)

    yield logo

    try:
        await logo.delete()
    except Exception:
        pass
