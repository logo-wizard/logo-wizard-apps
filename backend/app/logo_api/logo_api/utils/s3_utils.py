import logging
import os

import aiofiles
from aiohttp import ClientSession, ClientTimeout


LOGGER = logging.getLogger(__name__)


async def download_from_s3(base_url: str, path: str, filename: str, expected_size_bytes: float) -> None:
    LOGGER.info(f'Going to download file from {base_url}/{path} into {filename}')
    bytes_read = 0
    prev_output_progress = 0
    output_step_percent = 10
    async with ClientSession(base_url, timeout=ClientTimeout(60)) as session:
        async with session.get(path) as resp:
            resp.raise_for_status()
            async with aiofiles.open(filename, 'wb') as fd:
                while True:
                    chunk = await resp.content.read(1024 ** 2 * 10)  # TODO smaller chunks?
                    bytes_read += len(chunk)
                    if not chunk:
                        break
                    await fd.write(chunk)
                    progress = bytes_read / expected_size_bytes * 100
                    if progress > prev_output_progress + output_step_percent:
                        LOGGER.info(f'Progress: {progress:.3f}%')
                        prev_output_progress = progress
    LOGGER.info(f'Done downloading {filename}')


async def download_colorization_model_weights_from_s3(
        s3_base_url: str,
        s3_bucket: str,
        filename: str = 'icolorit_small_4ch_patch16_224.pth',
        force: bool = False,
) -> None:
    LOGGER.info('Going to download iColoriT weights')
    models_dir = '/models'
    if not os.path.exists(models_dir):
        os.makedirs(models_dir)
    sd_weights_filename = os.path.join(models_dir, filename)
    if not force and os.path.isfile(sd_weights_filename):
        LOGGER.info('Already have iColoriT weights')
    else:
        await download_from_s3(
            base_url=s3_base_url,
            path=f'/{s3_bucket}/models/{filename}',
            filename=sd_weights_filename,
            expected_size_bytes=285.9 * 1024 ** 2,
        )
