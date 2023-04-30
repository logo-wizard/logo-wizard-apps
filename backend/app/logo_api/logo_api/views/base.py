from typing import Type, Any

import aioredis
import marshmallow as ma
from aiohttp import web

import logo_api.schemas.logo as logo_schemas
from logo_api.models import Logo


class LogoApiBaseView(web.View):
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
