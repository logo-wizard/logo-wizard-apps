import logging
from typing import Any, ClassVar, AsyncGenerator

import attr
from aiobotocore.session import get_session


LOGGER = logging.getLogger(__name__)


@attr.s
class S3FromMultipartUploader:
    multipart_bytes_per_chunk: ClassVar[int] = 6 * 1024 ** 2  # 6 MB

    s3_host: str = attr.ib()
    s3_bucket: str = attr.ib()
    secret_key: str = attr.ib()
    access_key_id: str = attr.ib()

    _part_info: dict[str, list[dict[str, Any]]] = attr.ib(init=False, factory=lambda: dict(Parts=[]))

    async def begin_multipart_upload(self, data_iter: AsyncGenerator, key: str) -> bool:
        session = get_session()
        async with session.create_client(
            's3',
            endpoint_url=self.s3_host,
            aws_secret_access_key=self.secret_key,
            aws_access_key_id=self.access_key_id,
        ) as client:
            create_multipart_upload_resp = await client.create_multipart_upload(
                ACL='bucket-owner-full-control',
                Bucket=self.s3_bucket,
                Key=key,
            )

            upload_id = create_multipart_upload_resp['UploadId']

            LOGGER.info(f'Created multipart upload {upload_id=}')

            part_number = 1
            part_info = dict(Parts=[])

            async for chunk in data_iter:
                resp = await client.upload_part(
                    Bucket=self.s3_bucket,
                    Body=chunk,
                    UploadId=upload_id,
                    PartNumber=part_number,
                    Key=key
                )

                part_info['Parts'].append(
                    {
                        'PartNumber': part_number,
                        'ETag': resp['ETag']
                    }
                )
                part_number += 1

            # list_parts_resp = await client.list_parts(
            #     Bucket=self.s3_bucket,
            #     Key=key,
            #     UploadId=upload_id
            # )

            # You have to sort parts in ascending order. Otherwise, api will reject request
            part_list = sorted(part_info['Parts'], key=lambda k: k['PartNumber'])
            part_info['Parts'] = part_list
            LOGGER.info(f'COMPLETED [{len(part_info["Parts"])}]')

            await client.complete_multipart_upload(
                Bucket=self.s3_bucket,
                Key=key,
                UploadId=upload_id,
                MultipartUpload=part_info
            )

        return True
