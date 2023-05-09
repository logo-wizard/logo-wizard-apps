from typing import ClassVar, Optional

import attr

from logo_api.enums import LogoProcessingStatus
from logo_api.redis_model import RedisModel


@attr.s(init=True, kw_only=True)
class Logo(RedisModel):
    KEY_PREFIX: ClassVar[str] = 'logo'

    title: str = attr.ib()
    specialization: list[str] = attr.ib()
    palette: str = attr.ib()
    style: str = attr.ib()
    objects: list[str] = attr.ib()
    is_public: bool = attr.ib(default=True)

    created_by: Optional[str] = attr.ib(default=None)
    status: LogoProcessingStatus = attr.ib()
    prompt: Optional[str] = attr.ib(default=None)
    s3_key: Optional[str] = attr.ib(default=None)
    link: Optional[str] = attr.ib(default=None)

    mockups_s3_keys: Optional[list[str]] = attr.ib(default=None)


@attr.s(init=True, kw_only=True)
class TextDetectionTask(RedisModel):
    KEY_PREFIX: ClassVar[str] = 'text_detect'
    DEFAULT_TTL_SEC = 6 * 3600

    img_data_url: str = attr.ib()
    status: LogoProcessingStatus = attr.ib()
    mask_data_url: Optional[str] = attr.ib(default=None)


@attr.s(init=True, kw_only=True)
class TextErasureTask(RedisModel):
    KEY_PREFIX: ClassVar[str] = 'text_erase'

    img_data_url: str = attr.ib()
    mask_data_url: str = attr.ib()
    status: LogoProcessingStatus = attr.ib()
    result_data_url: Optional[str] = attr.ib(default=None)


@attr.s(init=True, kw_only=True)
class ImageStylizationTask(RedisModel):
    KEY_PREFIX: ClassVar[str] = 'image_stylize'

    img_data_url: str = attr.ib()
    prompt: str = attr.ib()
    status: LogoProcessingStatus = attr.ib()
    result_data_url: Optional[str] = attr.ib(default=None)
