from aiohttp import web, hdrs
from aiohttp.typedefs import Handler

from logo_api.common import AIOHTTPMiddleware


ALL_METHODS = ('DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT')
BASIC_HEADERS = ('Origin', 'X-Requested-With', 'Content-Type', 'Accept')


def cors_middleware(
        allow_origins: tuple[str, ...],
        allow_headers: tuple[str, ...] = BASIC_HEADERS,
        allow_methods: tuple[str, ...] = ALL_METHODS,
        allow_credentials: bool = False,
        exposed_routes: tuple[str, ...] = ('/api/v1/ping',),
) -> AIOHTTPMiddleware:
    @web.middleware
    async def middleware(request: web.Request, handler: Handler) -> web.StreamResponse:
        is_options_request = request.method == 'OPTIONS'
        is_preflight_request = (
            is_options_request
            and hdrs.ACCESS_CONTROL_REQUEST_METHOD in request.headers
        )

        if is_preflight_request:
            response = web.StreamResponse()
        else:
            response = await handler(request)

        allow_all_origins = '*' in allow_origins
        if allow_all_origins or request.path in exposed_routes:
            response.headers[hdrs.ACCESS_CONTROL_ALLOW_ORIGIN] = '*'
        elif (request_origin := request.headers[hdrs.ORIGIN]) in allow_origins:
            response.headers[hdrs.ACCESS_CONTROL_ALLOW_ORIGIN] = request_origin

        response.headers[hdrs.ACCESS_CONTROL_ALLOW_METHODS] = ','.join(allow_methods)
        response.headers[hdrs.ACCESS_CONTROL_ALLOW_HEADERS] = ','.join(allow_headers)

        if allow_credentials and not allow_all_origins:
            response.headers[hdrs.ACCESS_CONTROL_ALLOW_CREDENTIALS] = 'true'

        if is_preflight_request:
            raise web.HTTPOk(text='', headers=response.headers)

        return response

    return middleware
