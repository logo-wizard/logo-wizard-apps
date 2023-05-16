import asyncio
import logging

import aiobotocore.client
import aiobotocore.session


logging.basicConfig(level=logging.INFO)
LOGGER = logging.getLogger(__name__)


def create_s3_client(
        access_key_id: str,
        secret_access_key: str,
        endpoint_url: str
) -> aiobotocore.session.ClientCreatorContext:
    session = aiobotocore.session.get_session()
    return session.create_client(
        service_name='s3',
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
        endpoint_url=endpoint_url,
    )


async def main():
    s3_client_ctx = create_s3_client(
        'ACCESS KEY ID',
        'SECRET KEY',
        'S3 HOST',
    )
    import urllib.request

    async with s3_client_ctx as s3_client:
        resp = await s3_client.list_objects_v2(
            Bucket='s3-logo',
            MaxKeys=1000,
            Prefix='sample-',
        )
        all_keys = [obj['Key'] for obj in resp['Contents']]
        LOGGER.info(f'Found {len(all_keys)} keys, going to download inside ./samples')

    for key in all_keys:
        urllib.request.urlretrieve(f"https://storage.yandexcloud.net/s3-logo/{key}", f"./samples/{key}")
        LOGGER.info('.')

    LOGGER.info('Done')


if __name__ == '__main__':
    asyncio.run(main())
