import asyncio
import base64
import json
import logging
from typing import AsyncGenerator

import cv2
import numpy as np
from aiohttp import web, BodyPartReader


from logo_api.views.base import LogoApiBaseView

from logo_api.views.utils.colorization.colorization import Colorization, ColorizationMock


LOGGER = logging.getLogger(__name__)


def image_to_png_data_url(img: np.ndarray) -> str:
    _, buffer = cv2.imencode('.png', img)
    data_url = 'data:image/png;base64,' + base64.b64encode(buffer).decode('utf-8')
    return data_url


def colorize(
        colorization: Colorization,
        img: np.ndarray,
        points_image: list[tuple[int, int]],
        points_gamut: list[tuple[int, int]],
) -> tuple[str, str]:
    """ Performs colorization, returns data urls for result and gamut """

    colorization.read_image(img)

    for pos_image, pos_gamut in zip(points_image, points_gamut):
        colorization.set_pos(pos_image)
        colorization.change_color(pos_gamut)

    result = cv2.cvtColor(colorization.result, cv2.COLOR_RGB2BGR)
    result = cv2.resize(result, (512, 512), interpolation=cv2.INTER_CUBIC)
    result_data_url = image_to_png_data_url(result)

    gamut = cv2.cvtColor(colorization.gamut.ab_grid.masked_rgb, cv2.COLOR_RGB2BGR)
    masked_gamut_data_url = image_to_png_data_url(gamut)

    return result_data_url, masked_gamut_data_url


class ColorizationView(LogoApiBaseView):
    async def post(self) -> web.StreamResponse:
        reader = await self.request.multipart()
        file = await reader.next()

        async def _chunk_iter(chunk_size: int = 10 * 1024 * 1024) -> AsyncGenerator[bytes, None]:
            assert isinstance(file, BodyPartReader)
            while True:
                chunk = await file.read_chunk(size=chunk_size)
                if chunk:
                    LOGGER.debug(f'Received chunk of {len(chunk)} bytes.')
                    yield chunk
                else:
                    LOGGER.info('Empty chunk received.')
                    break

        image_bytes = b''
        async for chunk in _chunk_iter():
            image_bytes += chunk
        image_bytes = base64.decodebytes(image_bytes.split(b',')[1])
        nparr = np.fromstring(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        # image = cv2.resize(iamge, (720, 720), interpolation=cv2.INTER_CUBIC)

        def _map_range(n: float, prev_max: float, new_max: float) -> float:
            return n / prev_max * new_max

        points_reader = await reader.next()
        points_str = await points_reader.read(decode=True)
        points = json.loads(points_str)

        points_image = points['pointsImage']
        points_image = [
            (
                int(_map_range(float(p['x']), 512, 512)),
                int(_map_range(float(p['y']), 512, 512))
            ) for p in points_image
        ]

        points_gamut = points['pointsGamut']
        points_gamut = [
            (
                int(_map_range(float(p['x']), 128, 224)),
                int(_map_range(float(p['y']), 128, 224))
            ) for p in points_gamut
        ]

        color_model = self.request.app['__COLORIZATION_MODEL__']
        if color_model is None:
            LOGGER.info('Got not colorization model, apparently it is mocked')
            colorization = ColorizationMock(model=color_model, load_size=224, win_size=512, device='cpu')
        else:
            colorization = Colorization(model=color_model, load_size=224, win_size=512, device='cpu')

        loop = asyncio.get_event_loop()
        result_data_url, masked_gamut_data_url = await loop.run_in_executor(
            self.request.app['tpe'], colorize,
            colorization,
            image,
            points_image,
            points_gamut,
        )

        return web.json_response({'result': result_data_url, 'gamut': masked_gamut_data_url})
