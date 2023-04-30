import marshmallow as ma

from logo_api.enums import LogoProcessingStatus
from logo_api.schemas.base import BaseRequestSchema


class GenerateImageRequestSchema(BaseRequestSchema):
    title = ma.fields.String()
    specialization = ma.fields.List(ma.fields.String())
    palette = ma.fields.String()
    style = ma.fields.String()
    objects = ma.fields.List(ma.fields.String())
    is_public = ma.fields.Boolean(load_default=True)


class ReGenerateImageRequestSchema(BaseRequestSchema):
    logo_id = ma.fields.String()


class GenerateImageResponseSchema(BaseRequestSchema):
    logo_id = ma.fields.String(required=True)


class BaseLogoInfoRequestSchema(BaseRequestSchema):
    logo_id = ma.fields.String(required=True)


class LogoStatusRequestSchema(BaseLogoInfoRequestSchema):
    pass


class LogoStatusResponseSchema(BaseRequestSchema):
    status = ma.fields.Enum(enum=LogoProcessingStatus, required=True)


class LogoInfoRequestSchema(BaseLogoInfoRequestSchema):
    pass


class LogoInfoBatchRequestSchema(BaseRequestSchema):
    logos = ma.fields.Nested(BaseLogoInfoRequestSchema, many=True, required=True)


class LogoInfoResponseSchema(BaseRequestSchema):
    id = ma.fields.String(required=True)
    created_by = ma.fields.String(allow_none=True)
    # created_at = ma.fields.DateTime()
    is_public = ma.fields.Boolean()
    title = ma.fields.String(required=True)
    status = ma.fields.Enum(enum=LogoProcessingStatus, required=True)
    s3_key = ma.fields.String(allow_none=True)
    link = ma.fields.String(allow_none=True)


class UserLogoRequestSchema(BaseRequestSchema):
    user_id = ma.fields.String()


class LogoListResponseSchema(BaseRequestSchema):
    class LogoListItemSchema(BaseRequestSchema):
        logo_id = ma.fields.String()

    logos = ma.fields.Nested(LogoListItemSchema, many=True)
