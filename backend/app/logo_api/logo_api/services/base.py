from typing import ClassVar, Generic, TypeVar

import attr
from aiohttp import web


_API_SERVICE_TV = TypeVar('_API_SERVICE_TV', bound='APIService')


@attr.s(kw_only=True)
class APIService(Generic[_API_SERVICE_TV]):
    """ Can be used as a mixin to any class to allow binding its instance (single) to an aiohttp app """

    APP_CTX_KEY: ClassVar[str]

    def bind_to_app(self, app: web.Application) -> None:
        app[self.APP_CTX_KEY] = self

    @classmethod
    def get_for_app(cls, app: web.Application) -> _API_SERVICE_TV:
        return app[cls.APP_CTX_KEY]
