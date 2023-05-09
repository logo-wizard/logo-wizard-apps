from typing import Any, Optional

import aioredis
import attr
from diffusers import StableDiffusionPipeline

from logo_configs.settings_submodels import S3Settings
from logo_worker.app_settings import StableDiffusionSettings
from logo_worker.models.styler.canny import Canny
from logo_worker.models.text_eraser.detector import Detector
from logo_worker.models.text_eraser.eraser import LaMa


@attr.s
class GlobalWorkerContext:  # TODO CONSIDER: use builtin arq context with own dedicated component classes
    redis_misc_pool: Optional[aioredis.ConnectionPool] = attr.ib(default=None)

    s3_settings: Optional[S3Settings] = attr.ib(default=None)

    device: Optional[Any] = attr.ib(default=None)  # type: ignore  # TODO: fix

    sd_settings: Optional[StableDiffusionSettings] = attr.ib(default=None)
    sd_pipe: Optional[StableDiffusionPipeline] = attr.ib(default=None)

    text_detector: Optional[Detector] = attr.ib(default=None)
    text_eraser: Optional[LaMa] = attr.ib(default=None)

    styler: Optional[Canny] = attr.ib(default=None)
    styler_mock: bool = attr.ib(default=False)


GLOBAL_WORKER_CTX = GlobalWorkerContext()
