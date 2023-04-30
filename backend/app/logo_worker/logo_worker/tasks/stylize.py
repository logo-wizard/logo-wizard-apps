import asyncio
import base64
import io
import logging
from typing import Optional

import aioredis
from PIL import Image, ImageDraw

from logo_worker_interface.task_params import StylizeImageTaskParams
from logo_api.enums import LogoProcessingStatus
from logo_api.models.models import ImageStylizationTask
from logo_api.redis_model import RedisModelManager

from logo_worker.context import GLOBAL_WORKER_CTX


LOGGER = logging.getLogger(__name__)


def actual_blocking_styler(img_data_url: str, prompt: str) -> str:
    img_b64 = img_data_url.split(',')[1]
    img_bytes = base64.b64decode(img_b64)
    img_file = io.BytesIO(img_bytes)
    img_pil = Image.open(img_file)

    if not GLOBAL_WORKER_CTX.styler_mock:
        styler = GLOBAL_WORKER_CTX.styler
        result_pil = styler(image=img_pil, style=prompt).images[0]
    else:
        draw = ImageDraw.Draw(img_pil)
        draw.rectangle((0, 0, 200, 20), fill='black')
        draw.text((0, 0), prompt, (255, 255, 255))
        result_pil = img_pil

    result_file = io.BytesIO()
    result_pil.save(result_file, format="PNG")
    result_bytes = result_file.getvalue()
    result_b64 = base64.b64encode(result_bytes)
    result_data_url = 'data:image/png;base64,' + result_b64.decode('utf-8')

    return result_data_url


async def stylize_image(ctx, params: StylizeImageTaskParams) -> None:
    img_obj_id = params.img_obj_id
    img_stylization_obj: Optional[ImageStylizationTask] = None

    try:
        redis: aioredis.Redis = aioredis.Redis(connection_pool=GLOBAL_WORKER_CTX.redis_misc_pool)

        rmm = RedisModelManager(redis=redis)
        img_stylization_obj = await ImageStylizationTask.get(manager=rmm, obj_id=img_obj_id)
        LOGGER.info(f'Going to stylize ({img_stylization_obj.prompt}) img id={img_obj_id}, ctx={ctx["job_id"]}')

        loop = asyncio.get_running_loop()
        result_data_url = await loop.run_in_executor(
            ctx['tpe'], actual_blocking_styler,
            img_stylization_obj.img_data_url,
            img_stylization_obj.prompt,
        )

        img_stylization_obj.result_data_url = result_data_url
        img_stylization_obj.status = LogoProcessingStatus.ready
        await img_stylization_obj.save()

        LOGGER.info('%s DONE', ctx['job_id'])
    except Exception as ex:
        LOGGER.exception(ex)
        if img_stylization_obj is None:
            LOGGER.exception('Cannot retry task')
        else:
            img_stylization_obj.status = LogoProcessingStatus.failed
            await img_stylization_obj.save()
