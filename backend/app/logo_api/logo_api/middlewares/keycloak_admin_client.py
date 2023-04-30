from __future__ import annotations

import logging
from typing import Any, ClassVar, Optional

import attr
from aiohttp import ClientSession, ClientTimeout, FormData, web
from aiohttp.typedefs import Handler

from logo_api.common import AIOHTTPMiddleware


LOGGER = logging.getLogger(__name__)


@attr.s
class KeycloakAdminClient:
    CTX_KEY: ClassVar[str] = 'KC_ADMIN_CLIENT'

    host: str = attr.ib()
    realm: str = attr.ib()
    admin_username: str = attr.ib(repr=False)
    admin_password: str = attr.ib(repr=False)

    _access_token: str = attr.ib(init=False, repr=False)
    _session: Optional[ClientSession] = attr.ib(init=False, default=None)

    def _get_session(self) -> ClientSession:
        return ClientSession(
            base_url=f'{self.host}',
            timeout=ClientTimeout(total=60),
        )

    def __attrs_post_init__(self) -> None:
        self._session = self._get_session()

    async def close(self) -> None:
        if self._session is not None:
            await self._session.close()

    async def __aenter__(self) -> KeycloakAdminClient:
        if self._session is None:
            self._session = self._get_session()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        await self.close()
        self._session = None

    async def _get_access_token(self) -> str:
        resp = await self._session.post(
            '/realms/master/protocol/openid-connect/token',
            data=FormData(dict(
                username=self.admin_username,
                password=self.admin_password,
                grant_type='password',
                client_id='admin-cli',
            )),
        )
        resp.raise_for_status()

        resp_json = await resp.json()
        access_token = resp_json['access_token']
        return access_token

    async def get_user_info(self, user_id: str) -> dict[str, Any]:
        access_token = await self._get_access_token()
        resp = await self._session.get(
            f'/admin/realms/{self.realm}/users/{user_id}',
            headers={
                'Authorization': f'Bearer {access_token}'
            },
        )
        resp.raise_for_status()

        resp_json = await resp.json()
        return resp_json


def keycloak_admin_client_middleware(
        host: str,
        realm: str,
        admin_username: str,
        admin_password: str,
) -> AIOHTTPMiddleware:
    @web.middleware
    async def actual_middleware(request: web.Request, handler: Handler) -> web.StreamResponse:
        kc_admin_client = KeycloakAdminClient(
            host=host,
            realm=realm,
            admin_username=admin_username,
            admin_password=admin_password,
        )

        request[KeycloakAdminClient.CTX_KEY] = kc_admin_client

        try:
            return await handler(request)
        finally:
            await kc_admin_client.close()

    return actual_middleware
