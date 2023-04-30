import logging
from http import HTTPStatus
from typing import AsyncGenerator

from aiohttp import web, BodyPartReader
from arq import ArqRedis

import logo_api.schemas.styler as styler_schemas
from logo_worker_interface.task_params import StylizeImageTaskParams
from logo_api.enums import LogoProcessingStatus
from logo_api.models.models import ImageStylizationTask
from logo_api.redis_model import RedisModelManager, RedisModelNotFound
from logo_api.views.base import LogoApiBaseView


LOGGER = logging.getLogger(__name__)


class StylizeImageView(LogoApiBaseView):
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

        prompt_reader = await reader.next()
        prompt_bytes = await prompt_reader.read(decode=True)
        prompt = prompt_bytes.decode('utf-8')

        rmm = RedisModelManager(redis=self.get_redis())
        image_stylization_obj = ImageStylizationTask(
            manager=rmm,
            img_data_url=img_data_url,
            prompt=prompt,
            status=LogoProcessingStatus.in_progress,
        )
        await image_stylization_obj.save()

        arq_redis_pool: ArqRedis = self.request.app['arq_redis_pool']
        job = await arq_redis_pool.enqueue_job(
            'stylize_image',
            StylizeImageTaskParams(img_obj_id=image_stylization_obj.id),
        )

        LOGGER.info(f'Scheduled StylizeImageTask {prompt=} {image_stylization_obj.id=}, job_id={job.job_id}')

        return web.json_response(
            styler_schemas.StylizeImageResponseSchema().dump(dict(
                img_id=image_stylization_obj.id,
            )),
            status=HTTPStatus.CREATED,
        )


class ImageStylizationStatusView(LogoApiBaseView):
    async def get(self) -> web.StreamResponse:
        req_data = await self._load_post_request_schema_data(styler_schemas.ImageStylizationStatusRequestSchema)
        rmm = RedisModelManager(redis=self.get_redis())

        try:  # TODO make error handler middleware not to hardcode exception handling
            img_stylization_obj = await ImageStylizationTask.get(rmm, req_data['img_id'])
        except RedisModelNotFound:
            return web.json_response(status=404)

        # TODO security
        # if not img_stylization_obj.is_public and img_stylization_obj.created_by is not None and img_stylization_obj.created_by != self.request[USER_ID_REQUEST_KEY]:
        #     raise web.HTTPForbidden()

        return web.json_response(
            styler_schemas.ImageStylizationStatusResponseSchema().dump(dict(
                status=img_stylization_obj.status,
            ))
        )


class ImageStylizationResultView(LogoApiBaseView):
    async def get(self) -> web.StreamResponse:
        req_data = await self._load_post_request_schema_data(styler_schemas.ImageStylizationResultResponseSchema)
        rmm = RedisModelManager(redis=self.get_redis())

        try:  # TODO make error handler middleware not to hardcode exception handling
            img_stylization_id = await ImageStylizationTask.get(rmm, req_data['img_id'])
        except RedisModelNotFound:
            return web.json_response(status=404)

        # TODO security
        # if not img_stylization_id.is_public and img_stylization_id.created_by is not None and img_stylization_id.created_by != self.request[USER_ID_REQUEST_KEY]:
        #     raise web.HTTPForbidden()

        assert img_stylization_id.result_data_url is not None

        return web.json_response(dict(
            img_id=img_stylization_id.id,
            result=img_stylization_id.result_data_url,
        ))
