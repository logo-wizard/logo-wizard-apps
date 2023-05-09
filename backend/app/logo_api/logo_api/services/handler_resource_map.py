from __future__ import annotations

import functools
from typing import Type, Optional

import attr
from aiohttp import web
from aiohttp.typedefs import Handler

from logo_api.enums import HandlerResource
from logo_api.services.base import APIService


@attr.s
class HandlerResourceManager(APIService['HandlerResourceManager']):
    """ Allows storing feature flags for different handlers and check their presence for a particular handler """

    APP_CTX_KEY = '__HANDLER_RESOURCE_MAP__'

    _handler_resource_map: dict[Type[web.View], frozenset[HandlerResource]] = attr.ib()

    def has_resource(self, handler: Handler, resource: HandlerResource) -> bool:
        actual_handler_cls: Optional[Type[web.View]] = (
            handler.keywords.get('handler')
            if isinstance(handler, functools.partial)
            else None
        )
        handler_resources = self._handler_resource_map.get(actual_handler_cls, frozenset())

        return resource in handler_resources
