import asyncio
import os
import logging
import math
from typing import Any, ClassVar

import aiofiles
import attr
from aiobotocore.session import get_session
from aiobotocore.client import AioBaseClient
from aiofiles.threadpool.binary import AsyncBufferedReader
from aiohttp import ClientSession, ClientTimeout


LOGGER = logging.getLogger(__name__)


async def download_from_s3(base_url: str, path: str, filename: str, expected_size_bytes: float) -> None:
    LOGGER.info(f'Going to download file from {base_url}/{path} into {filename}')
    bytes_read = 0
    async with ClientSession(base_url, timeout=ClientTimeout(15 * 60)) as session:
        async with session.get(path) as resp:
            if resp.status != 200:
                resp.raise_for_status()
            async with aiofiles.open(filename, 'wb') as fd:
                while True:
                    chunk = await resp.content.read(1024 ** 2 * 10)  # TODO smaller chunks?
                    bytes_read += len(chunk)
                    if not chunk:
                        break
                    await fd.write(chunk)
                    progress = bytes_read / expected_size_bytes * 100
                    if progress - int(progress) < 0.01:
                        LOGGER.info(f'Progress: {progress:.3f}%')
    LOGGER.info(f'Done downloading {filename}')


async def download_model_weights_from_s3(
        s3_base_url: str,
        s3_bucket: str,
        filename: str = 'model.ckpt',
        force: bool = False,
) -> None:
    LOGGER.info('Going to download SD weights')
    models_dir = '/models'
    if not os.path.exists(models_dir):
        os.makedirs(models_dir)
    sd_weights_filename = os.path.join(models_dir, filename)
    if not force and os.path.isfile(sd_weights_filename):
        LOGGER.info('Already have SD weights')
    else:
        await download_from_s3(
            base_url=s3_base_url,
            path=f'/{s3_bucket}/models/{filename}',
            filename=sd_weights_filename,
            expected_size_bytes=3.97 * 1024 ** 3,
        )


async def download_erasure_model_weights_from_s3(
        s3_base_url: str,
        s3_bucket: str,
        filename: str = 'big-lama.pt',
        force: bool = False,
) -> None:
    LOGGER.info('Going to download erasure model weights')
    models_dir = '/models'
    if not os.path.exists(models_dir):
        os.makedirs(models_dir)
    weights_filename = os.path.join(models_dir, filename)
    if not force and os.path.isfile(weights_filename):
        LOGGER.info('Already have erasure model weights')
    else:
        await download_from_s3(
            base_url=s3_base_url,
            path=f'/{s3_bucket}/models/{filename}',
            filename=weights_filename,
            expected_size_bytes=205.7 * 1024 ** 2,
        )


async def download_model_configs_from_s3(s3_base_url: str, s3_bucket: str) -> None:
    LOGGER.info('Going to download SD config')
    configs_dir = '/configs'
    if not os.path.exists(configs_dir):
        os.makedirs(configs_dir)
    sd_config_filename = os.path.join(configs_dir, 'stable-diffusion_v1-inference.yaml')
    if os.path.isfile(sd_config_filename):
        LOGGER.info('Already have SD config')
    else:
        await download_from_s3(
            base_url=s3_base_url,
            path=f'/{s3_bucket}/configs/stable-diffusion_v1-inference.yaml',
            filename=sd_config_filename,
            expected_size_bytes=1.83 * 1024,
        )


@attr.s
class S3Uploader:
    multipart_bytes_per_chunk: ClassVar[int] = 6 * 1024 ** 2  # 6 MB

    s3_host: str = attr.ib()
    s3_bucket: str = attr.ib()
    secret_key: str = attr.ib()
    access_key_id: str = attr.ib()

    _part_info: dict[str, list[dict[str, Any]]] = attr.ib(init=False, factory=lambda: dict(Parts=[]))

    async def begin_multipart_upload(self, from_local_path: str, key: str) -> bool:
        if self._part_info['Parts']:
            self._part_info['Parts'] = []
        session = get_session()
        async with session.create_client(
            's3',
            endpoint_url=self.s3_host,
            aws_secret_access_key=self.secret_key,
            aws_access_key_id=self.access_key_id,
        ) as client:
            source_size = os.stat(from_local_path).st_size
            chunks_count = int(math.ceil(source_size / float(self.multipart_bytes_per_chunk)))
            LOGGER.info(f'Going to create a multipart upload with {chunks_count} chunks')

            create_multipart_upload_resp = await client.create_multipart_upload(
                ACL='bucket-owner-full-control',
                Bucket=self.s3_bucket,
                Key=key,
            )

            upload_id = create_multipart_upload_resp['UploadId']

            LOGGER.info(f'Created multipart upload {upload_id=}')

            tasks = []
            async with aiofiles.open(from_local_path, mode='rb') as file:
                for chunk_number in range(chunks_count):
                    tasks.append(
                        self._upload_chunk(
                            client=client,
                            file=file,
                            chunk_number=chunk_number,
                            key=key,
                            upload_id=upload_id,
                            source_size=source_size
                        )
                    )

                await asyncio.gather(*tasks)

            list_parts_resp = await client.list_parts(
                Bucket=self.s3_bucket,
                Key=key,
                UploadId=upload_id
            )

            # You have to sort parts in ascending order. Otherwise, api will reject request
            part_list = sorted(self._part_info['Parts'], key=lambda k: k['PartNumber'])
            self._part_info['Parts'] = part_list
            LOGGER.info(f'COMPLETED [{len(self._part_info["Parts"])}]')

            if len(list_parts_resp['Parts']) == chunks_count:
                LOGGER.info('Completing multipart upload')
                await client.complete_multipart_upload(
                    Bucket=self.s3_bucket,
                    Key=key,
                    UploadId=upload_id,
                    MultipartUpload=self._part_info
                )
                return True

            else:
                LOGGER.info('Aborting multipart upload')
                await client.abort_multipart_upload(
                    Bucket=self.s3_bucket,
                    Key=key,
                    UploadId=upload_id
                )
                return False

    async def _upload_chunk(
        self,
        client: AioBaseClient,
        file: AsyncBufferedReader,
        upload_id: str,
        chunk_number: int,
        source_size: int,
        key: str,
    ) -> None:
        offset = chunk_number * self.multipart_bytes_per_chunk
        remaining_bytes = source_size - offset
        bytes_to_read = min([self.multipart_bytes_per_chunk, remaining_bytes])
        part_number = chunk_number + 1

        # async with file_shared_lock:
        await file.seek(offset)
        chunk = await file.read(bytes_to_read)

        resp = await client.upload_part(
            Bucket=self.s3_bucket,
            Body=chunk,
            UploadId=upload_id,
            PartNumber=part_number,
            Key=key
        )

        self._part_info['Parts'].append(
            {
                'PartNumber': part_number,
                'ETag': resp['ETag']
            }
        )
