from __future__ import annotations

from enum import Enum

import aiohttp
import attr

from logo_api.services.base import APIService


class LanguageCode(Enum):
    ru = 'ru'
    en = 'en'


@attr.s(kw_only=True)
class YCTranslateClient(APIService['YCTranslateClient']):
    """ Async client for YC Translate with service account authorization """

    APP_CTX_KEY = '__TRANSLATOR_CLIENT__'

    translation_endpoint: str = attr.ib(default='https://translate.api.cloud.yandex.net/translate/v2/translate')
    raise_for_status: bool = attr.ib(default=True)

    _api_key: str = attr.ib(repr=False)

    async def translate(
            self,
            texts: list[str],
            target_language: LanguageCode = LanguageCode.ru,
    ) -> list[str]:
        headers = {
            'Authorization': f'Api-Key {self._api_key}'
        }
        request_body = dict(
            targetLanguageCode=target_language.value,
            texts=texts,
        )

        async with aiohttp.ClientSession(headers=headers) as session:
            async with session.post(self.translation_endpoint, json=request_body) as resp:
                if self.raise_for_status:
                    resp.raise_for_status()

                resp_json = await resp.json()
                translations = [translation['text'] for translation in resp_json['translations']]

        return translations


@attr.s(kw_only=True)
class YCTranslateClientMock(YCTranslateClient):
    async def translate(
            self,
            texts: list[str],
            target_language: LanguageCode = LanguageCode.ru,
    ) -> list[str]:
        return texts
