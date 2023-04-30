import logging

from aiohttp import web
from aiohttp.typedefs import Handler
from keycloak import KeycloakOpenID

from logo_api.common import AIOHTTPMiddleware
from logo_api.enums import HandlerResource
from logo_api.services.handler_resource_map import HandlerResourceManager
from logo_api.services.user_id import USER_ID_REQUEST_KEY


LOGGER = logging.getLogger(__name__)


def keycloak_user_id_middleware(
        realm: str,
        client_id: str,
        host: str,
        client_secret_key: str,
        client_public_key: str,
) -> AIOHTTPMiddleware:
    keycloak = KeycloakOpenID(
        server_url=host,
        client_id=client_id,
        realm_name=realm,
        client_secret_key=client_secret_key,
    )

    @web.middleware
    async def actual_middleware(request: web.Request, handler: Handler) -> web.StreamResponse:
        # try:
        #     view_scopes = view_func.cls.keycloak_scopes
        # except AttributeError as e:
        #     logger.debug(
        #         'Allowing free acesss, since no authorization configuration (keycloak_scopes) found for this request route :%s',
        #         request)
        #     return None
        request[USER_ID_REQUEST_KEY] = None

        async def _continue_request() -> web.StreamResponse:
            return await handler(request)

        handler_resource_mgr = HandlerResourceManager.get_for_app(request.app)

        if handler_resource_mgr.has_resource(handler, HandlerResource.SKIP_AUTH):
            return await _continue_request()

        if 'Authorization' not in request.headers:
            return await _continue_request()

        auth_header = request.headers.get('Authorization').split()
        token = auth_header[1] if len(auth_header) == 2 else auth_header[0]

        # Get default if method is not defined.
        # required_scope = view_scopes.get(request.method, None) if view_scopes.get(request.method, None) else view_scopes.get('DEFAULT', None)

        # DEFAULT scope not found and DEFAULT_ACCESS is DENY
        # if not required_scope and self.default_access == 'DENY':
        #     return JsonResponse({"detail": PermissionDenied.default_detail},
        #                         status=PermissionDenied.status_code)

        # try:
        #     user_permissions = keycloak.get_permissions(
        #         token=token,
        #         method_token_info='decode',
        #         key=client_public_key,
        #     )
        #     LOGGER.info(f'{user_permissions=}')
        # except Exception as e:
        #     LOGGER.error(f'{e}')

        try:
            user_info = keycloak.userinfo(token)
        except Exception as e:
            if handler_resource_mgr.has_resource(handler, HandlerResource.OPTIONAL_AUTH):
                LOGGER.info('Not authenticated, optional authentication')
                return await _continue_request()
            LOGGER.error(f'{e}')
            raise web.HTTPUnauthorized()

        request[USER_ID_REQUEST_KEY] = user_info.get('sub')

        # for perm in user_permissions:
        #     if required_scope in perm.scopes:
        #         return None

        LOGGER.info(f'Authenticated as {request[USER_ID_REQUEST_KEY]}')

        return await _continue_request()

    return actual_middleware
