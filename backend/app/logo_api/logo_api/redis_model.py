from __future__ import annotations

import abc
import logging
import uuid
from datetime import timedelta
from typing import ClassVar, Optional, Union, Type, Any

import aioredis
import attr
import marshmallow as ma


LOGGER = logging.getLogger(__name__)


class RedisModelException(Exception):
    pass


class RedisRecordNotFound(RedisModelException):
    pass


@attr.s(init=True, kw_only=True)
class RedisModel(metaclass=abc.ABCMeta):
    KEY_PREFIX: ClassVar[str]
    DEFAULT_TTL_SEC: ClassVar[Optional[int]] = None
    _manager: Optional[RedisModelManager] = attr.ib(default=None)

    id: str = attr.ib(factory=lambda: str(uuid.uuid4()))

    @classmethod
    def _generate_key_by_id(cls, obj_id: str) -> str:
        assert cls.KEY_PREFIX
        return '/'.join((cls.KEY_PREFIX, obj_id))

    def generate_key(self) -> str:
        return self._generate_key_by_id(self.id)

    @classmethod
    async def get(cls, manager: "RedisModelManager", obj_id: str) -> "RedisModel":
        key = cls._generate_key_by_id(obj_id)
        return await manager.get(key=key, target_cls=cls)

    async def save(self, ttl: Union[int, timedelta, None] = None) -> None:
        assert self._manager
        await self._manager.save(self, ttl=ttl)

    async def delete(self) -> None:
        assert self._manager
        await self._manager.delete(self)


@attr.s
class RedisModelManager:
    _redis: aioredis.Redis = attr.ib()

    def _serialize_object(self, obj: RedisModel) -> str:
        schema_cls = _get_model_schema_class(type(obj))
        schema = schema_cls()
        return schema.dumps(obj)

    def _deserialize_object(self, json_data: str, target_cls: Type[RedisModel]) -> RedisModel:
        schema_cls = _get_model_schema_class(target_cls)
        schema = schema_cls()
        return schema.loads(json_data)

    async def get(self, key: str, target_cls: Type[RedisModel]) -> RedisModel:
        json_data = await self._redis.get(key)
        if json_data is None:
            LOGGER.info(f'RedisModel object not found: {key}')
            raise RedisRecordNotFound()

        obj = self._deserialize_object(json_data, target_cls)
        obj._manager = self

        return obj

    async def save(self, obj: RedisModel, ttl: Union[int, timedelta, None] = None) -> None:
        obj_key = obj.generate_key()
        data_json = self._serialize_object(obj)

        if ttl is None and obj.DEFAULT_TTL_SEC is not None:
            ttl = obj.DEFAULT_TTL_SEC

        if ttl:
            await self._redis.setex(obj_key, ttl, data_json)
        else:
            await self._redis.set(obj_key, data_json)

    async def delete(self, obj: RedisModel) -> None:
        obj_key = obj.generate_key()
        await self._redis.delete(obj_key)


class BaseSchema(ma.Schema):
    class Meta:
        unknown = ma.EXCLUDE

        target: Type

    @ma.post_load(pass_many=False)
    def to_object(self, data: dict[str, Any], **kwargs: Any) -> Any:
        return self.Meta.target(**data)


class BaseModelSchema(BaseSchema):
    id = ma.fields.String()


_STORAGE_SCHEMA_BY_MODEL_CLASS: dict[Type[RedisModel], Type[BaseModelSchema]] = dict()


def _get_model_schema_class(model_cls: Type[RedisModel]) -> Type[BaseModelSchema]:
    return _STORAGE_SCHEMA_BY_MODEL_CLASS[model_cls]


def register_redis_model_storage_schema(model_cls: Type[RedisModel], schema_cls: Type[BaseModelSchema]) -> None:
    _STORAGE_SCHEMA_BY_MODEL_CLASS[model_cls] = schema_cls
