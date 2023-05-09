from aiohttp import web, ClientResponseError

from logo_api.middlewares.keycloak_admin_client import KeycloakAdminClient
from logo_api.schemas import user as user_schemas
from logo_api.schemas.user import UserInfoResponseSchema
from logo_api.views.base import LogoApiBaseView


class UserInfoView(LogoApiBaseView):
    """ User info from Keylocak """

    async def get(self) -> web.StreamResponse:
        req_data = await self._load_post_request_schema_data(user_schemas.UserInfoRequestSchema)
        user_id: str = req_data['user_id']

        async with self.request[KeycloakAdminClient.CTX_KEY] as kc_client:  # type: KeycloakAdminClient
            try:
                user_info = await kc_client.get_user_info(user_id)
            except ClientResponseError as e:
                return web.json_response(data={'details': e.message}, status=e.status)

        return web.json_response(
            UserInfoResponseSchema().dump(user_info),
        )
