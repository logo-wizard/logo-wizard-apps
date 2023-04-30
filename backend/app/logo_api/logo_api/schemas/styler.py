import marshmallow as ma

from logo_api.enums import LogoProcessingStatus
from logo_api.schemas.base import BaseRequestSchema


class BaseStylerSchema(BaseRequestSchema):
    img_id = ma.fields.String(required=True)


class StylizeImageResponseSchema(BaseStylerSchema):
    pass


class ImageStylizationStatusRequestSchema(BaseStylerSchema):
    pass


class ImageStylizationStatusResponseSchema(BaseStylerSchema):
    status = ma.fields.Enum(enum=LogoProcessingStatus, required=True)


class ImageStylizationResultResponseSchema(BaseStylerSchema):
    pass
