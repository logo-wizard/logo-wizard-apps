import logging
from http import HTTPStatus
from typing import AsyncGenerator

from aiohttp import web, BodyPartReader
from arq import ArqRedis

import logo_api.schemas.text as text_schemas
from logo_worker_interface.task_params import EraseTextTaskParams
from logo_api.enums import LogoProcessingStatus
from logo_api.models.models import TextErasureTask
from logo_api.redis_model import RedisModelManager, RedisModelNotFound
from logo_api.views.base import LogoApiBaseView


LOGGER = logging.getLogger(__name__)


class EraseTextView(LogoApiBaseView):
    async def post(self) -> web.StreamResponse:
        reader = await self.request.multipart()

        async def _chunk_iter(part: BodyPartReader, chunk_size: int = 10 * 1024 * 1024) -> AsyncGenerator[bytes, None]:
            assert isinstance(part, BodyPartReader)
            while True:
                chunk = await part.read_chunk(size=chunk_size)
                if chunk:
                    LOGGER.debug(f'Received chunk of {len(chunk)} bytes.')
                    yield chunk
                else:
                    LOGGER.info('Empty chunk received.')
                    break

        file = await reader.next()
        image_bytes = b''
        async for chunk in _chunk_iter(file):
            image_bytes += chunk
        img_data_url = image_bytes.decode('utf-8')

        mask = await reader.next()
        mask_bytes = b''
        async for chunk in _chunk_iter(mask):
            mask_bytes += chunk
        mask_data_url = mask_bytes.decode('utf-8')

        rmm = RedisModelManager(redis=self.get_redis())
        text_erase_task_obj = TextErasureTask(
            manager=rmm,
            img_data_url=img_data_url,
            mask_data_url=mask_data_url,
            status=LogoProcessingStatus.in_progress,
        )
        await text_erase_task_obj.save()

        arq_redis_pool: ArqRedis = self.request.app['arq_redis_pool']
        job = await arq_redis_pool.enqueue_job(
            'text_erase',
            EraseTextTaskParams(text_obj_id=text_erase_task_obj.id),
        )

        LOGGER.info(f'Scheduled EraseTextTask {text_erase_task_obj.id=}, job_id={job.job_id}')

        return web.json_response(
            text_schemas.EraseTextResponseSchema().dump(dict(
                text_id=text_erase_task_obj.id,
            )),
            status=HTTPStatus.CREATED,
        )


class TextErasureStatusView(LogoApiBaseView):
    async def get(self) -> web.StreamResponse:
        req_data = await self._load_post_request_schema_data(text_schemas.TextStatusRequestSchema)
        rmm = RedisModelManager(redis=self.get_redis())

        try:  # TODO make error handler middleware not to hardcode exception handling
            text_erasure_obj = await TextErasureTask.get(rmm, req_data['text_id'])
        except RedisModelNotFound:
            return web.json_response(status=404)

        # TODO security
        # if not text_erasure_obj.is_public and text_erasure_obj.created_by is not None and text_erasure_obj.created_by != self.request[USER_ID_REQUEST_KEY]:
        #     raise web.HTTPForbidden()

        return web.json_response(
            text_schemas.TextStatusResponseSchema().dump(dict(
                status=text_erasure_obj.status,
            ))
        )


class TextErasureResultView(LogoApiBaseView):
    async def get(self) -> web.StreamResponse:
        req_data = await self._load_post_request_schema_data(text_schemas.TextErasureResultResponseSchema)
        rmm = RedisModelManager(redis=self.get_redis())

        try:  # TODO make error handler middleware not to hardcode exception handling
            text_erasure_obj = await TextErasureTask.get(rmm, req_data['text_id'])
        except RedisModelNotFound:
            return web.json_response(status=404)

        # TODO security
        # if not text_erasure_obj.is_public and text_erasure_obj.created_by is not None and text_erasure_obj.created_by != self.request[USER_ID_REQUEST_KEY]:
        #     raise web.HTTPForbidden()

        assert text_erasure_obj.result_data_url is not None

        return web.json_response(dict(
            text_id=text_erasure_obj.id,
            result=text_erasure_obj.result_data_url,
        ))
