import asyncio
import base64
import logging
from typing import Optional

import aioredis
import cv2
import numpy as np

from logo_worker_interface.task_params import DetectTextTaskParams
from logo_api.enums import LogoProcessingStatus
from logo_api.models.models import TextDetectionTask
from logo_api.redis_model import RedisModelManager
from logo_api.utils.image_utils import image_to_png_data_url

from logo_worker.context import GLOBAL_WORKER_CTX


LOGGER = logging.getLogger(__name__)


def actual_blocking_detector(img_data_url: str) -> str:
    image_string = img_data_url.split(',')[1]
    nparr = np.frombuffer(base64.b64decode(image_string), np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    detector = GLOBAL_WORKER_CTX.text_detector
    mask = detector(image)

    mask_data_url = image_to_png_data_url(mask)

    return mask_data_url


async def text_detect(ctx, params: DetectTextTaskParams) -> None:
    text_obj_id = params.text_obj_id
    text_detect_obj: Optional[TextDetectionTask] = None

    try:
        redis: aioredis.Redis = aioredis.Redis(connection_pool=GLOBAL_WORKER_CTX.redis_misc_pool)

        rmm = RedisModelManager(redis=redis)
        text_detect_obj = await TextDetectionTask.get(manager=rmm, obj_id=text_obj_id)
        LOGGER.info(f'Going to get mask for text id={text_obj_id}, ctx={ctx["job_id"]}')

        loop = asyncio.get_running_loop()
        mask_data_url = await loop.run_in_executor(ctx['tpe'], actual_blocking_detector, text_detect_obj.img_data_url)

        text_detect_obj.mask_data_url = mask_data_url
        text_detect_obj.status = LogoProcessingStatus.ready
        await text_detect_obj.save()

        LOGGER.info('%s DONE', ctx['job_id'])
    except Exception as ex:
        LOGGER.exception(ex)
        if text_detect_obj is None:
            LOGGER.exception('Cannot retry task')
        else:
            text_detect_obj.status = LogoProcessingStatus.failed
            await text_detect_obj.save()
