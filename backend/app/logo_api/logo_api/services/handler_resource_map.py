from __future__ import annotations

import functools
from typing import ClassVar, Type, Optional

import attr
from aiohttp import web
from aiohttp.typedefs import Handler

from logo_api.enums import HandlerResource


@attr.s
class HandlerResourceManager:
    _APP_CTX_KEY: ClassVar[str] = '_HANDLER_RESOURCE_MAP_'

    _handler_resource_map: dict[Type[web.View], frozenset[HandlerResource]] = attr.ib()

    def bind_to_app(self, app: web.Application) -> None:
        app[self._APP_CTX_KEY] = self

    @classmethod
    def get_for_app(cls, app) -> HandlerResourceManager:
        return app[cls._APP_CTX_KEY]

    def has_resource(self, handler: Handler, resource: HandlerResource) -> bool:
        actual_handler_cls: Optional[Type[web.View]] = (
            handler.keywords.get('handler')
            if isinstance(handler, functools.partial)
            else None
        )
        handler_resources = self._handler_resource_map.get(actual_handler_cls, frozenset())

        return resource in handler_resources
