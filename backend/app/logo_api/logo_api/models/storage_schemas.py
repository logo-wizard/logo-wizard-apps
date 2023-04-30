import marshmallow as ma

from logo_api.enums import LogoProcessingStatus
from logo_api.models.models import Logo, TextDetectionTask, TextErasureTask, ImageStylizationTask
from logo_api.redis_model import BaseModelSchema


class LogoSchema(BaseModelSchema):
    class Meta(BaseModelSchema.Meta):
        target = Logo

    title = ma.fields.String()
    specialization = ma.fields.List(ma.fields.String())
    palette = ma.fields.String()
    style = ma.fields.String()
    objects = ma.fields.List(ma.fields.String())
    is_public = ma.fields.Boolean()

    created_by = ma.fields.String(allow_none=True)
    status = ma.fields.Enum(enum=LogoProcessingStatus)
    prompt = ma.fields.String()
    s3_key = ma.fields.String(allow_none=True)
    link = ma.fields.String(allow_none=True)

    mockups_s3_keys = ma.fields.List(ma.fields.String(), allow_none=True)


class TextDetectionTaskSchema(BaseModelSchema):
    class Meta(BaseModelSchema.Meta):
        target = TextDetectionTask

    img_data_url = ma.fields.String()
    status = ma.fields.Enum(enum=LogoProcessingStatus)
    mask_data_url = ma.fields.String(allow_none=True)


class TextErasureTaskSchema(BaseModelSchema):
    class Meta(BaseModelSchema.Meta):
        target = TextErasureTask

    img_data_url = ma.fields.String()
    mask_data_url = ma.fields.String()
    status = ma.fields.Enum(enum=LogoProcessingStatus)
    result_data_url = ma.fields.String(allow_none=True)


class ImageStylizationTaskSchema(BaseModelSchema):
    class Meta(BaseModelSchema.Meta):
        target = ImageStylizationTask

    img_data_url = ma.fields.String()
    prompt = ma.fields.String()
    status = ma.fields.Enum(enum=LogoProcessingStatus)
    result_data_url = ma.fields.String(allow_none=True)
