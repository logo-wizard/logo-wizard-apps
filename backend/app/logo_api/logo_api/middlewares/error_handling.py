from typing import Type

from aiohttp import web
from aiohttp.typedefs import Handler

from logo_api.common import AIOHTTPMiddleware
from logo_api.redis_model import RedisRecordNotFound


ERR_TO_HTTP_STATUS_MAP: dict[Type[Exception], int] = {
    RedisRecordNotFound: 404,
}


def simple_error_handling_middleware() -> AIOHTTPMiddleware:

    @web.middleware
    async def middleware(request: web.Request, handler: Handler) -> web.StreamResponse:
        try:
            response = await handler(request)
        except Exception as e:
            if isinstance(e, web.HTTPClientError):
                status_code = e.status_code
            else:
                status_code = ERR_TO_HTTP_STATUS_MAP.get(type(e))

            if status_code is None:
                raise
            return web.json_response(status=status_code)

        return response

    return middleware
