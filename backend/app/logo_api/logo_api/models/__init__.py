from logo_api.redis_model import register_redis_model_storage_schema

from .models import Logo, TextDetectionTask, TextErasureTask, ImageStylizationTask
from .storage_schemas import LogoSchema, TextDetectionTaskSchema, TextErasureTaskSchema, ImageStylizationTaskSchema


__all__ = (
    'Logo',
    'LogoSchema',

    'TextDetectionTask',
    'TextDetectionTaskSchema',

    'TextErasureTask',
    'TextErasureTaskSchema',

    'ImageStylizationTask',
    'ImageStylizationTaskSchema',
)


register_redis_model_storage_schema(Logo, LogoSchema)
register_redis_model_storage_schema(TextDetectionTask, TextDetectionTaskSchema)
register_redis_model_storage_schema(TextErasureTask, TextErasureTaskSchema)
register_redis_model_storage_schema(ImageStylizationTask, ImageStylizationTaskSchema)
