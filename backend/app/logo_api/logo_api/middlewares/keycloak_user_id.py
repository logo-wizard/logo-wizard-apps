import logging
from typing import Optional

from aiohttp import web
from aiohttp.typedefs import Handler
from keycloak import KeycloakOpenID

from logo_api.common import AIOHTTPMiddleware
from logo_api.enums import HandlerResource
from logo_api.services.handler_resource_map import HandlerResourceManager
from logo_api.views.base import LogoApiBaseView


LOGGER = logging.getLogger(__name__)


def keycloak_user_id_middleware(
        realm: str,
        client_id: str,
        host: str,
        client_secret_key: str,
        client_public_key: str,
        fake_user_id: Optional[str] = None,
) -> AIOHTTPMiddleware:
    keycloak = KeycloakOpenID(
        server_url=host,
        client_id=client_id,
        realm_name=realm,
        client_secret_key=client_secret_key,
    )

    @web.middleware
    async def actual_middleware(request: web.Request, handler: Handler) -> web.StreamResponse:
        """
        Injects the user_id into the request if the user is authenticated.
        If not, checks access with resource manager and either leaves it as None or raises an error
        """

        USER_ID_REQUEST_KEY = LogoApiBaseView.USER_ID_REQUEST_KEY
        request[USER_ID_REQUEST_KEY] = None

        async def _continue_request() -> web.StreamResponse:
            return await handler(request)

        handler_resource_mgr = HandlerResourceManager.get_for_app(request.app)

        if handler_resource_mgr.has_resource(handler, HandlerResource.SKIP_AUTH):
            return await _continue_request()

        if fake_user_id is not None:
            request[USER_ID_REQUEST_KEY] = fake_user_id
            LOGGER.info(f'Authenticated as a fake user ({fake_user_id})')
            return await _continue_request()

        if 'Authorization' not in request.headers:
            return await _continue_request()

        auth_header = request.headers.get('Authorization').split()
        token = auth_header[1] if len(auth_header) == 2 else auth_header[0]

        try:
            user_info = keycloak.userinfo(token)
        except Exception as e:
            if handler_resource_mgr.has_resource(handler, HandlerResource.OPTIONAL_AUTH):
                LOGGER.info('Not authenticated, optional authentication')
                return await _continue_request()
            LOGGER.error(f'{e}')
            raise web.HTTPUnauthorized()

        request[USER_ID_REQUEST_KEY] = user_info.get('sub')

        LOGGER.info(f'Authenticated as {request[USER_ID_REQUEST_KEY]}')

        return await _continue_request()

    return actual_middleware
