import logging
from http import HTTPStatus

from aiohttp import web
from arq import ArqRedis

import logo_api.schemas.text as text_schemas
from logo_worker_interface.task_params import DetectTextTaskParams
from logo_api.enums import LogoProcessingStatus
from logo_api.models.models import TextDetectionTask
from logo_api.redis_model import RedisModelManager
from logo_api.views.base import LogoApiBaseView


LOGGER = logging.getLogger(__name__)


class DetectTextView(LogoApiBaseView):
    """ Create a text detection task """

    async def post(self) -> web.StreamResponse:
        reader = await self.request.multipart()

        file = await reader.next()
        image_bytes = await self._read_part_bytes(file)
        img_data_url = image_bytes.decode('utf-8')

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
    """ Text detection task status """

    async def get(self) -> web.StreamResponse:
        req_data = await self._load_post_request_schema_data(text_schemas.TextStatusRequestSchema)
        rmm = RedisModelManager(redis=self.get_redis())

        text_detection_obj = await TextDetectionTask.get(rmm, req_data['text_id'])

        return web.json_response(
            text_schemas.TextStatusResponseSchema().dump(dict(
                status=text_detection_obj.status,
            ))
        )


class TextDetectionResultView(LogoApiBaseView):
    """ Text detection task result """

    async def get(self) -> web.StreamResponse:
        req_data = await self._load_post_request_schema_data(text_schemas.TextDetectionResultResponseSchema)
        rmm = RedisModelManager(redis=self.get_redis())

        text_detect_obj = await TextDetectionTask.get(rmm, req_data['text_id'])

        return web.json_response(dict(
            text_id=text_detect_obj.id,
            mask=text_detect_obj.mask_data_url,
        ))
