import logging

from aiohttp import web

from logo_api.services.user_id import USER_ID_REQUEST_KEY
from logo_api.views.base import LogoApiBaseView


LOGGER = logging.getLogger(__name__)


class PingView(LogoApiBaseView):
    async def get(self) -> web.StreamResponse:
        return web.json_response({
            'result': 'pong',
            'created_by': self.request[USER_ID_REQUEST_KEY],
        })
