import logging
from typing import Type, Any, AsyncGenerator, ClassVar

import aioredis
import marshmallow as ma
from aiohttp import web, BodyPartReader

import logo_api.schemas.logo as logo_schemas
from logo_api.models import Logo


LOGGER = logging.getLogger(__name__)


class LogoApiBaseView(web.View):
    USER_ID_REQUEST_KEY: ClassVar[str] = '__USER_ID_REQUEST_KEY__'
    
    async def _load_post_request_schema_data(self, schema_cls: Type[ma.Schema]) -> dict[str, Any]:
        json_data = await self.request.json() if self.request.can_read_body else {}
        req_data = schema_cls().load({
            **self.request.match_info,
            **json_data,
        })
        return req_data

    def get_redis(self) -> aioredis.Redis:
        return aioredis.Redis(connection_pool=self.request.app['redis_pool'])

    def dump_logo(self, logo: Logo) -> dict[str, Any]:
        return logo_schemas.LogoInfoResponseSchema().dump(dict(
            id=logo.id,
            created_by=logo.created_by,
            # created_at=logo.created_at,
            is_public=logo.is_public,
            title=logo.title,
            status=logo.status,
            s3_key=logo.s3_key,
            link=logo.link,
        ))

    # noinspection PyMethodMayBeStatic
    async def _read_part_bytes(self, part_reader: BodyPartReader, chunk_size: int = 10 * 1024 * 1024) -> bytes:
        async def _chunk_iter() -> AsyncGenerator[bytes, None]:
            while True:
                read_chunk = await part_reader.read_chunk(size=chunk_size)
                if read_chunk:
                    LOGGER.debug(f'Received chunk of {len(read_chunk)} bytes.')
                    yield read_chunk
                else:
                    LOGGER.info('Empty chunk received.')
                    break

        res = b''
        async for chunk in _chunk_iter():
            res += chunk

        return res
