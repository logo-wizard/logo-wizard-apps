import asyncio
import logging
import os
from concurrent.futures import ThreadPoolExecutor

import aioredis
import asyncpg
import torch
from aiohttp import web
from arq import create_pool
from arq.connections import RedisSettings
from timm.models import create_model

from logo_api.utils.s3_utils import download_colorization_model_weights_from_s3
from logo_configs.logging_config import configure_logging

import logo_api.views.colorization as colorization_views
import logo_api.views.logo as logo_views
import logo_api.views.misc as misc_views
import logo_api.views.user as user_views
import logo_api.views.stylization as styler_views
import logo_api.views.text_detect as text_detect_views
import logo_api.views.text_erase as text_erase_views
from logo_api.app_settings import ApiSettings
from logo_api.middlewares.cors import cors_middleware
from logo_api.middlewares.error_handling import simple_error_handling_middleware
from logo_api.middlewares.keycloak_user_id import keycloak_user_id_middleware
from logo_api.enums import HandlerResource
from logo_api.middlewares.keycloak_admin_client import keycloak_admin_client_middleware
from logo_api.services.handler_resource_map import HandlerResourceManager
from logo_api.views.utils.colorization.modeling import *
from logo_api.views.utils.mockups import S3ImageProvider


LOGGER = logging.getLogger(__name__)


def get_colorization_model(model_path='/models/icolorit_small_4ch_patch16_224.pth', device='cpu'):
    model = create_model(
        model_path[:-4],
        pretrained=False,
        drop_path_rate=0.0,
        drop_block_rate=None,
        use_rpb=True,
        avg_hint=True,
        head_mode='cnn',
        mask_cent=False,
    )
    model.to(device)
    checkpoint = torch.load(model_path, map_location=device)
    model.load_state_dict(checkpoint['model'])
    model.eval()

    return model


def init_hook(settings: ApiSettings):

    async def actual_init_hook(target_app: web.Application) -> None:
        target_app['arq_redis_pool'] = await create_pool(RedisSettings(
            host=settings.REDIS_ARQ.HOST,
            port=settings.REDIS_ARQ.PORT,
            database=settings.REDIS_ARQ.DB,
            password=settings.REDIS_ARQ.PASSWORD,
            ssl=settings.REDIS_ARQ.SSL,
            ssl_ca_certs=settings.REDIS_ARQ.CERT_PATH,
            # conn_timeout=60,
        ))

        pg_pool = await asyncpg.create_pool(
            min_size=10,
            max_size=100,
            loop=asyncio.get_running_loop(),
            host=settings.PG.HOST,
            port=settings.PG.PORT,
            user=settings.PG.USERNAME,
            password=settings.PG.PASSWORD,
            database=settings.PG.DB_NAME,
        )
        target_app['pg_pool'] = pg_pool

        tpe = ThreadPoolExecutor(max_workers=min(32, os.cpu_count() * 3 + 4))
        target_app['tpe'] = tpe

        image_provider = S3ImageProvider(
            s3_host=settings.S3.HOST,
            s3_bucket=settings.S3.BUCKET,
            secret_key=settings.S3.SECRET_KEY,
            access_key_id=settings.S3.ACCESS_KEY_ID,
        )
        target_app['image_provider'] = image_provider
        target_app['s3_settings'] = settings.S3

        colorization_device = 'cpu'
        LOGGER.info('Going to initialize colorization model')
        if settings.COLORIZATION.MOCK:
            LOGGER.info('Colorization model is going to be mocked, skipping initialization')
            target_app['__COLORIZATION_MODEL__'] = None
        else:
            await download_colorization_model_weights_from_s3(
                s3_base_url=settings.S3.HOST,
                s3_bucket=settings.S3.BUCKET,
                filename='icolorit_small_4ch_patch16_224.pth',  # TODO from settings
                force=False,
            )
            color_model = get_colorization_model(
                model_path='/models/icolorit_small_4ch_patch16_224.pth',  # TODO from settings
                device=colorization_device,
            )
            target_app['__COLORIZATION_MODEL__'] = color_model
            LOGGER.info('Colorization model is initialized')

        LOGGER.info('Init hook is done')

    return actual_init_hook


def create_app(settings: ApiSettings) -> web.Application:
    app = web.Application(
        middlewares=[
            cors_middleware(
                allow_origins=settings.CORS.ALLOW_ORIGINS,
                allow_headers=settings.CORS.ALLOW_HEADERS,
                allow_methods=settings.CORS.ALLOW_METHODS,
                allow_credentials=settings.CORS.ALLOW_CREDENTIALS,
                exposed_routes=settings.CORS.EXPOSED_ROUTES,
            ),
            keycloak_user_id_middleware(
                host=settings.KEYCLOAK.HOST,
                realm=settings.KEYCLOAK.REALM,
                client_id=settings.KEYCLOAK.CLIENT_ID,
                client_secret_key=settings.KEYCLOAK.CLIENT_SECRET_KEY,
                client_public_key=settings.KEYCLOAK.CLIENT_PUBLIC_KEY,
                fake_user_id='first_user_id' if settings.APP_ENV == 'tests' else None,
            ),
            keycloak_admin_client_middleware(
                host=settings.KEYCLOAK.HOST,
                realm=settings.KEYCLOAK.REALM,
                admin_username=settings.KEYCLOAK.ADMIN_USERNAME,
                admin_password=settings.KEYCLOAK.ADMIN_PASSWORD,
            ),
            simple_error_handling_middleware(),
        ],
    )

    app.on_startup.append(init_hook(settings))

    misc_redis_settings = settings.REDIS_MISC
    db = misc_redis_settings.DB
    protocol = 'rediss' if misc_redis_settings.SSL else 'redis'
    host = misc_redis_settings.HOST
    port = misc_redis_settings.PORT
    redis_pool = aioredis.ConnectionPool.from_url(
        url=f"{protocol}://{host}:{port}/{db}",
        password=misc_redis_settings.PASSWORD,
    )
    app['redis_pool'] = redis_pool

    app.router.add_route('get', '/api/v1/ping', misc_views.PingView)
    app.router.add_route('post', '/api/v1/logo', logo_views.GenerateImageView)
    app.router.add_route('post', '/api/v1/logo/{logo_id}/regen', logo_views.ReGenerateImageView)
    app.router.add_route('get', '/api/v1/logo/my', logo_views.LogoMyListView)
    app.router.add_route('get', '/api/v1/logo/user/{user_id}', logo_views.UserLogoListView)
    app.router.add_route('get', '/api/v1/logo/{logo_id}/status', logo_views.LogoStatusView)
    app.router.add_route('get', '/api/v1/logo/{logo_id}/info', logo_views.LogoInfoView)
    app.router.add_route('delete', '/api/v1/logo/{logo_id}', logo_views.LogoInfoView)
    app.router.add_route('get', '/api/v1/logo/{logo_id}/mockups', logo_views.MockupsView)
    app.router.add_route('post', '/api/v1/logo/{logo_id}/image', logo_views.ImageView)
    app.router.add_route('post', '/api/v1/logo/batch', logo_views.LogoInfoBatch)

    app.router.add_route('get', '/api/v1/user/{user_id}/info', user_views.UserInfoView)

    app.router.add_route('post', '/api/v1/colorize', colorization_views.ColorizationView)

    app.router.add_route('post', '/api/v1/text/detect', text_detect_views.DetectTextView)
    app.router.add_route('get', '/api/v1/text/detect/{text_id}/status', text_detect_views.TextDetectStatusView)
    app.router.add_route('get', '/api/v1/text/detect/{text_id}/result', text_detect_views.TextDetectionResultView)

    app.router.add_route('post', '/api/v1/text/erase', text_erase_views.EraseTextView)
    app.router.add_route('get', '/api/v1/text/erase/{text_id}/status', text_erase_views.TextErasureStatusView)
    app.router.add_route('get', '/api/v1/text/erase/{text_id}/result', text_erase_views.TextErasureResultView)

    app.router.add_route('post', '/api/v1/stylize', styler_views.StylizeImageView)
    app.router.add_route('get', '/api/v1/stylize/{img_id}/status', styler_views.ImageStylizationStatusView)
    app.router.add_route('get', '/api/v1/stylize/{img_id}/result', styler_views.ImageStylizationResultView)

    HandlerResourceManager({
        misc_views.PingView: frozenset({HandlerResource.SKIP_AUTH}),
        logo_views.GenerateImageView: frozenset({HandlerResource.OPTIONAL_AUTH}),
        logo_views.LogoStatusView: frozenset({HandlerResource.OPTIONAL_AUTH}),
        logo_views.LogoInfoView: frozenset({HandlerResource.OPTIONAL_AUTH}),
        logo_views.MockupsView: frozenset({HandlerResource.OPTIONAL_AUTH}),
        logo_views.LogoInfoBatch: frozenset({HandlerResource.OPTIONAL_AUTH}),
        user_views.UserInfoView: frozenset({HandlerResource.OPTIONAL_AUTH}),
    }).bind_to_app(app)

    return app


def main() -> None:
    configure_logging(app_name='logo_api')

    settings = ApiSettings()

    LOGGER.info('Going to instantiate application')
    current_app = create_app(settings)

    LOGGER.info('Firing up the app')
    web.run_app(
        current_app,
        host='0.0.0.0',
        port=8000,
    )


if __name__ == '__main__':
    main()

