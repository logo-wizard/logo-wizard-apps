import asyncio
import logging
import os

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


async def create_s3_bucket(s3_client: aiobotocore.client.AioBaseClient, bucket_name: str) -> None:
    resp = await s3_client.create_bucket(Bucket=bucket_name, ACL='public-read')
    LOGGER.info(resp)
    resp = await s3_client.put_bucket_cors(
        Bucket=bucket_name,
        CORSConfiguration=dict(
            CORSRules=[
                dict(
                    AllowedMethods=['GET'],
                    AllowedOrigins=['*'],
                )
            ]
        )
    )
    LOGGER.info(resp)

    for filename in os.listdir('./mockup_bg'):
        with open(f'mockup_bg/{filename}', 'rb') as f:
            image_bytes = f.read()
            resp = await s3_client.put_object(
                Bucket=bucket_name,
                Key=f'mockup_bg/{filename}',
                Body=image_bytes,
                ACL='public-read',
            )
        LOGGER.info(resp)


async def main():
    s3_client_ctx = create_s3_client(
        'accessKey1',
        'verySecretKey1',
        'http://localhost:50000',
    )
    async with s3_client_ctx as s3_client:
        await create_s3_bucket(
            s3_client=s3_client,
            bucket_name='s3-logo',
        )
    LOGGER.info('The bucket was created successfully')


if __name__ == '__main__':
    asyncio.run(main())
