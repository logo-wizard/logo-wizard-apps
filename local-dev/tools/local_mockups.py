import asyncio
import os
from concurrent.futures import ThreadPoolExecutor

from logo_api.utils.image_provider import FSImageProvider
from logo_api.views.utils.mockups import create_mockups_for_image


image_provider = FSImageProvider()

asyncio.run(create_mockups_for_image(
    key='../mockup_bg/download.png',  # image to create mockups for
    image_provider=image_provider,
    tpe=ThreadPoolExecutor(max_workers=min(32, os.cpu_count() * 3 + 4)),
))
