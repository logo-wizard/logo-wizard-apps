import base64
import logging
from http import HTTPStatus
from typing import Any

import asyncpg
from aiobotocore.session import get_session
from aiohttp import web
from arq import ArqRedis

from logo_worker_interface.task_params import GenerateImageTaskParams

import logo_api.schemas.logo as logo_schemas
from logo_api.enums import LogoProcessingStatus
from logo_api.models import Logo
from logo_api.redis_model import RedisModelManager, RedisRecordNotFound
from logo_api.services.pg import insert_logo, get_logo_ids_by_user, delete_logo
from logo_api.services.translator_client import YCTranslateClient, LanguageCode
from logo_api.views.base import LogoApiBaseView

from logo_api.views.utils import mockups
from logo_configs.settings_submodels import S3Settings


LOGGER = logging.getLogger(__name__)


class GenerateImageView(LogoApiBaseView):
    """
    Creates a Logo by composing a prompt from the settings provided by the user and creates a task for the worker
    """

    async def post(self) -> web.StreamResponse:
        req_data = await self._load_post_request_schema_data(logo_schemas.GenerateImageRequestSchema)

        specializations_str = ', '.join(req_data['specialization'])

        objects_raw: list[str] = req_data['objects']
        objects_en = objects_raw
        if objects_raw:
            translate_client = YCTranslateClient.get_for_app(self.request.app)
            objects_en = await translate_client.translate(
                texts=objects_raw,
                target_language=LanguageCode.en,
            )
        objects_str = None
        if objects_en:
            objects_str = 'with ' + objects_en[0]
            if len(objects_en) > 2:
                objects_str += ', '
            if len(objects_en) > 1:
                objects_str += (', '.join(objects_en[1:-1]) + ' and ' + objects_en[-1])

        prompt = 'A logo of ' + ', '.join((s for s in (
            specializations_str,
            objects_str,
            req_data['palette'],
            req_data['style'],
        ) if s))
        prompt += ', modern, minimalism, vector art, 2d, best quality, centered'

        LOGGER.info(f'Creating logo as user {self.request[self.USER_ID_REQUEST_KEY]}')

        rmm = RedisModelManager(redis=self.get_redis())
        logo = Logo(
            manager=rmm,
            prompt=prompt,
            title=req_data['title'],
            specialization=req_data['specialization'],
            palette=req_data['palette'],
            style=req_data['style'],
            objects=req_data['objects'],
            status=LogoProcessingStatus.in_progress,
            created_by=self.request[self.USER_ID_REQUEST_KEY],
            is_public=req_data['is_public'],
        )
        await logo.save(ttl=None)

        arq_redis_pool: ArqRedis = self.request.app['arq_redis_pool']
        job = await arq_redis_pool.enqueue_job(
            'generate_image',
            GenerateImageTaskParams(logo_id=logo.id),
        )

        LOGGER.info(f'Scheduled GenerateImageTask for prompt "{prompt}", job_id={job.job_id}, logo id = {logo.id}')

        if logo.created_by is not None:
            pg_pool: asyncpg.Pool = self.request.app['pg_pool']
            async with pg_pool.acquire() as conn:  # type: asyncpg.Connection
                await insert_logo(conn, logo)

        return web.json_response(
            logo_schemas.GenerateImageResponseSchema().dump(dict(
                logo_id=logo.id,
            )),
            status=HTTPStatus.CREATED,
        )


class ReGenerateImageView(LogoApiBaseView):
    async def post(self) -> web.StreamResponse:
        req_data = await self._load_post_request_schema_data(logo_schemas.ReGenerateImageRequestSchema)

        rmm = RedisModelManager(redis=self.get_redis())

        logo = await Logo.get(rmm, req_data['logo_id'])

        if logo.created_by is not None and logo.created_by != self.request[self.USER_ID_REQUEST_KEY]:
            raise web.HTTPForbidden()

        logo.status = LogoProcessingStatus.in_progress
        await logo.save(ttl=None)

        arq_redis_pool: ArqRedis = self.request.app['arq_redis_pool']
        job = await arq_redis_pool.enqueue_job(
            'generate_image',
            GenerateImageTaskParams(logo_id=logo.id),
        )

        LOGGER.info(
            f'Scheduled GenerateImageTask (regen)'
            f' for prompt "{logo.prompt}",'
            f' job_id={job.job_id},'
            f' logo id = {logo.id}'
        )

        return web.json_response(self.dump_logo(logo))


class ImageView(LogoApiBaseView):
    """ Saves the provided image into the object storage by the key of the logo provided """

    async def post(self) -> web.StreamResponse:
        req_data = logo_schemas.BaseLogoInfoRequestSchema().load({
            **self.request.match_info,
        })

        rmm = RedisModelManager(redis=self.get_redis())

        logo = await Logo.get(rmm, req_data['logo_id'])
        s3_key = logo.s3_key
        if logo.created_by is not None and logo.created_by != self.request[self.USER_ID_REQUEST_KEY]:
            raise web.HTTPForbidden()

        reader = await self.request.multipart()
        file = await reader.next()
        image_bytes = await self._read_part_bytes(file)
        image_bytes = base64.decodebytes(image_bytes.split(b',')[1])

        session = get_session()
        s3_settings: S3Settings = self.request.app['s3_settings']
        async with session.create_client(
                's3',
                endpoint_url=s3_settings.HOST,
                aws_secret_access_key=s3_settings.SECRET_KEY,
                aws_access_key_id=s3_settings.ACCESS_KEY_ID,
        ) as client:
            await client.put_object(Bucket=s3_settings.BUCKET, Key=s3_key, Body=image_bytes, ACL='public-read')

        return web.json_response({'ok': 'ok'})


class MockupsView(LogoApiBaseView):
    """ Creates mockups in the object storage for the logo with the provided id """

    async def get(self) -> web.StreamResponse:
        req_data = await self._load_post_request_schema_data(logo_schemas.BaseLogoInfoRequestSchema)
        rmm = RedisModelManager(redis=self.get_redis())

        logo = await Logo.get(rmm, req_data['logo_id'])

        if (
                not logo.is_public and
                logo.created_by is not None and
                logo.created_by != self.request[self.USER_ID_REQUEST_KEY]
        ):
            raise web.HTTPForbidden()

        mockups_s3_keys = await mockups.create_mockups_for_image(
            logo.s3_key,
            self.request.app['image_provider'],
            self.request.app['tpe'],
        )
        LOGGER.info(f'Got mockup keys: {mockups_s3_keys}')

        s3_settings: S3Settings = self.request.app['s3_settings']
        mockups_s3_links = [f'{s3_settings.HOST}/{s3_settings.BUCKET}/{key}' for key in mockups_s3_keys]

        return web.json_response(mockups_s3_links)


class LogoStatusView(LogoApiBaseView):
    """ Logo processing status """

    async def get(self) -> web.StreamResponse:
        req_data = await self._load_post_request_schema_data(logo_schemas.LogoStatusRequestSchema)
        rmm = RedisModelManager(redis=self.get_redis())

        logo = await Logo.get(rmm, req_data['logo_id'])

        if (
                not logo.is_public and
                logo.created_by is not None and
                logo.created_by != self.request[self.USER_ID_REQUEST_KEY]
        ):
            raise web.HTTPForbidden()

        return web.json_response(
            logo_schemas.LogoStatusResponseSchema().dump(dict(
                status=logo.status,
            ))
        )


class LogoInfoView(LogoApiBaseView):
    """ Single logo resource """

    async def get(self) -> web.StreamResponse:
        req_data = await self._load_post_request_schema_data(logo_schemas.LogoInfoRequestSchema)
        rmm = RedisModelManager(redis=self.get_redis())

        logo = await Logo.get(rmm, req_data['logo_id'])

        if (
                not logo.is_public and
                logo.created_by is not None and
                logo.created_by != self.request[self.USER_ID_REQUEST_KEY]
        ):
            raise web.HTTPForbidden()

        return web.json_response(
            self.dump_logo(logo)
        )

    async def delete(self) -> web.StreamResponse:
        req_data = await self._load_post_request_schema_data(logo_schemas.LogoInfoRequestSchema)
        rmm = RedisModelManager(redis=self.get_redis())

        logo = await Logo.get(rmm, req_data['logo_id'])

        if logo.created_by is None or logo.created_by != self.request[self.USER_ID_REQUEST_KEY]:
            raise web.HTTPForbidden()

        await logo.delete()
        pg_pool: asyncpg.Pool = self.request.app['pg_pool']
        async with pg_pool.acquire() as conn:  # type: asyncpg.Connection
            await delete_logo(conn, logo.id)

        return web.json_response(dict(
            logo_id=logo.id,
        ))


class LogoInfoBatch(LogoInfoView):
    """ Batch of logos """

    async def post(self) -> web.StreamResponse:
        req_data = await self._load_post_request_schema_data(logo_schemas.LogoInfoBatchRequestSchema)
        logos = req_data['logos']

        rmm = RedisModelManager(redis=self.get_redis())

        logos_batch: list[dict[str, Any]] = []

        for logo in logos:
            try:
                logo = await Logo.get(rmm, logo['logo_id'])
            except RedisRecordNotFound:
                continue

            if (
                    not logo.is_public and
                    logo.created_by is not None and
                    logo.created_by != self.request[self.USER_ID_REQUEST_KEY]
            ):
                continue

            logos_batch.append(self.dump_logo(logo))

        return web.json_response(logos_batch)


class LogoListViewBase(LogoApiBaseView):
    async def _get_logos_by_id(self, user_id: str, public_only: bool = True) -> list[str]:
        pg_pool: asyncpg.Pool = self.request.app['pg_pool']
        async with pg_pool.acquire() as conn:  # type: asyncpg.Connection
            logo_ids = await get_logo_ids_by_user(conn, user_id, public=True if public_only else None)

        return logo_ids


class LogoMyListView(LogoListViewBase):
    """ List of Logo IDs that are created by the authenticated user """

    async def get(self) -> web.StreamResponse:
        user_id: str = self.request[self.USER_ID_REQUEST_KEY]

        logo_ids = await self._get_logos_by_id(user_id, public_only=False)

        return web.json_response(
            logo_schemas.LogoListResponseSchema().dump(dict(
                logos=[
                    {'logo_id': id} for id in logo_ids
                ]
            ))
        )


class UserLogoListView(LogoListViewBase):
    """ List of Logo IDs that are created by the user with the provided user_id """

    async def get(self) -> web.StreamResponse:
        req_data = await self._load_post_request_schema_data(logo_schemas.UserLogoRequestSchema)
        request_user_id: str = req_data['user_id']

        # TODO currently there is an issue that if a user requests logos with this handler they will see
        #  them as if they were a stranger (i.e. public only)

        logo_ids = await self._get_logos_by_id(request_user_id, public_only=True)

        return web.json_response(
            logo_schemas.LogoListResponseSchema().dump(dict(
                logos=[
                    {'logo_id': id} for id in logo_ids
                ]
            ))
        )
