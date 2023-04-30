from typing import Callable, Awaitable

from aiohttp import web
from aiohttp.typedefs import Handler


AIOHTTPMiddleware = Callable[[web.Request, Handler], Awaitable[web.StreamResponse]]
