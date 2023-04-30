import logging
from http import HTTPStatus
from typing import AsyncGenerator

from aiohttp import web, BodyPartReader
from arq import ArqRedis

import logo_api.schemas.text as text_schemas
from logo_worker_interface.task_params import DetectTextTaskParams
from logo_api.enums import LogoProcessingStatus
from logo_api.models.models import TextDetectionTask
from logo_api.redis_model import RedisModelManager, RedisModelNotFound
from logo_api.views.base import LogoApiBaseView


LOGGER = logging.getLogger(__name__)


class DetectTextView(LogoApiBaseView):
    async def post(self) -> web.StreamResponse:
        reader = await self.request.multipart()
        file = await reader.next()

        async def _chunk_iter(chunk_size: int = 10 * 1024 * 1024) -> AsyncGenerator[bytes, None]:
            assert isinstance(file, BodyPartReader)
            while True:
                chunk = await file.read_chunk(size=chunk_size)
                if chunk:
                    LOGGER.debug(f'Received chunk of {len(chunk)} bytes.')
                    yield chunk
                else:
                    LOGGER.info('Empty chunk received.')
                    break

        image_bytes = b''
        async for chunk in _chunk_iter():
            image_bytes += chunk
        img_data_url = image_bytes.decode('utf-8')
        # image_bytes = base64.decodebytes(image_bytes.split(b',')[1])

        rmm = RedisModelManager(redis=self.get_redis())
        text_detect_task_obj = TextDetectionTask(
            manager=rmm,
            img_data_url=img_data_url,
            status=LogoProcessingStatus.in_progress,
        )
        await text_detect_task_obj.save()

        arq_redis_pool: ArqRedis = self.request.app['arq_redis_pool']
        job = await arq_redis_pool.enqueue_job(
            'text_detect',
            DetectTextTaskParams(text_obj_id=text_detect_task_obj.id),
        )

        LOGGER.info(f'Scheduled DetectTextTask {text_detect_task_obj.id=}, job_id={job.job_id}')

        return web.json_response(
            text_schemas.DetectTextResponseSchema().dump(dict(
                text_id=text_detect_task_obj.id,
            )),
            status=HTTPStatus.CREATED,
        )


class TextDetectStatusView(LogoApiBaseView):
    async def get(self) -> web.StreamResponse:
        req_data = await self._load_post_request_schema_data(text_schemas.TextStatusRequestSchema)
        rmm = RedisModelManager(redis=self.get_redis())

        try:  # TODO make error handler middleware not to hardcode exception handling
            logo = await TextDetectionTask.get(rmm, req_data['text_id'])
        except RedisModelNotFound:
            return web.json_response(status=404)

        # TODO security
        # if not logo.is_public and logo.created_by is not None and logo.created_by != self.request[USER_ID_REQUEST_KEY]:
        #     raise web.HTTPForbidden()

        return web.json_response(
            text_schemas.TextStatusResponseSchema().dump(dict(
                status=logo.status,
            ))
        )


class TextDetectionResultView(LogoApiBaseView):
    async def get(self) -> web.StreamResponse:
        req_data = await self._load_post_request_schema_data(text_schemas.TextDetectionResultResponseSchema)
        rmm = RedisModelManager(redis=self.get_redis())

        try:  # TODO make error handler middleware not to hardcode exception handling
            text_detect_obj = await TextDetectionTask.get(rmm, req_data['text_id'])
        except RedisModelNotFound:
            return web.json_response(status=404)

        # TODO security
        # if not text_detect_obj.is_public and text_detect_obj.created_by is not None and text_detect_obj.created_by != self.request[USER_ID_REQUEST_KEY]:
        #     raise web.HTTPForbidden()

        assert text_detect_obj.mask_data_url is not None

        return web.json_response(dict(
            text_id=text_detect_obj.id,
            mask=text_detect_obj.mask_data_url,
        ))
