import logging
from http import HTTPStatus

from aiohttp import web
from arq import ArqRedis

import logo_api.schemas.text as text_schemas
from logo_worker_interface.task_params import EraseTextTaskParams
from logo_api.enums import LogoProcessingStatus
from logo_api.models.models import TextErasureTask
from logo_api.redis_model import RedisModelManager
from logo_api.views.base import LogoApiBaseView


LOGGER = logging.getLogger(__name__)


class EraseTextView(LogoApiBaseView):
    """ Create a text erasure task """

    async def post(self) -> web.StreamResponse:
        reader = await self.request.multipart()

        img_reader = await reader.next()
        image_bytes = await self._read_part_bytes(img_reader)
        img_data_url = image_bytes.decode('utf-8')

        mask_reader = await reader.next()
        mask_bytes = await self._read_part_bytes(mask_reader)
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
    """ Text erasure task status """

    async def get(self) -> web.StreamResponse:
        req_data = await self._load_post_request_schema_data(text_schemas.TextStatusRequestSchema)
        rmm = RedisModelManager(redis=self.get_redis())

        text_erasure_obj = await TextErasureTask.get(rmm, req_data['text_id'])

        return web.json_response(
            text_schemas.TextStatusResponseSchema().dump(dict(
                status=text_erasure_obj.status,
            ))
        )


class TextErasureResultView(LogoApiBaseView):
    """ Text erasure task result """

    async def get(self) -> web.StreamResponse:
        req_data = await self._load_post_request_schema_data(text_schemas.TextErasureResultResponseSchema)
        rmm = RedisModelManager(redis=self.get_redis())

        text_erasure_obj = await TextErasureTask.get(rmm, req_data['text_id'])

        return web.json_response(dict(
            text_id=text_erasure_obj.id,
            result=text_erasure_obj.result_data_url,
        ))
