from typing import Type

from aiohttp import web
from aiohttp.typedefs import Handler

from logo_api.common import AIOHTTPMiddleware
from logo_api.redis_model import RedisModelNotFound


ERR_TO_HTTP_STATUS_MAP: dict[Type[Exception], int] = {
    RedisModelNotFound: 404,
}


def simple_error_handling_middleware() -> AIOHTTPMiddleware:

    @web.middleware
    async def middleware(request: web.Request, handler: Handler) -> web.StreamResponse:
        try:
            response = await handler(request)
        except Exception as e:
            status_code = ERR_TO_HTTP_STATUS_MAP.get(type(e))
            if status_code is None:
                raise
            return web.json_response(status=status_code)

        return response

    return middleware
