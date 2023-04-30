import marshmallow as ma

from logo_api.enums import LogoProcessingStatus
from logo_api.schemas.base import BaseRequestSchema


class BaseTextSchema(BaseRequestSchema):
    text_id = ma.fields.String(required=True)


class DetectTextResponseSchema(BaseTextSchema):
    pass


class EraseTextResponseSchema(BaseTextSchema):
    pass


class TextStatusRequestSchema(BaseTextSchema):
    pass


class TextStatusResponseSchema(BaseTextSchema):
    status = ma.fields.Enum(enum=LogoProcessingStatus, required=True)


class TextDetectionResultResponseSchema(BaseTextSchema):
    pass


class TextErasureResultResponseSchema(BaseTextSchema):
    pass
