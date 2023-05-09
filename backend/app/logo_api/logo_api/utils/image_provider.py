import abc
from typing import TypeVar, Generic

import attr
import cv2
import numpy as np
from aiobotocore.session import get_session
from aiohttp import ClientSession, ClientTimeout


_IMG_TV = TypeVar('_IMG_TV')


class ImageProvider(Generic[_IMG_TV], metaclass=abc.ABCMeta):
    """ Provides a universal interface for managing images in a particular storage """

    @abc.abstractmethod
    async def get_image(self, key: str) -> _IMG_TV:
        raise NotImplementedError

    @abc.abstractmethod
    async def save_image(self, img: _IMG_TV, key: str) -> None:
        raise NotImplementedError


@attr.s
class S3ImageProvider(ImageProvider[np.ndarray]):
    s3_host: str = attr.ib()
    s3_bucket: str = attr.ib()
    secret_key: str = attr.ib()
    access_key_id: str = attr.ib()

    async def get_image(self, key: str) -> np.ndarray:
        async with ClientSession(self.s3_host, timeout=ClientTimeout(15 * 60)) as session:
            async with session.get(f'/{self.s3_bucket}/{key}') as resp:
                if resp.status != 200:
                    resp.raise_for_status()
                arr = np.asarray(bytearray(await resp.read()), dtype=np.uint8)

        img = cv2.imdecode(arr, -1)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGBA)
        return img

    async def save_image(self, img: np.ndarray, key: str) -> None:
        img_fixed = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
        image_bytes = cv2.imencode('.png', img_fixed)[1].tobytes()
        session = get_session()
        async with session.create_client(
                's3',
                endpoint_url=self.s3_host,
                aws_secret_access_key=self.secret_key,
                aws_access_key_id=self.access_key_id,
        ) as client:
            await client.put_object(Bucket=self.s3_bucket, Key=key, Body=image_bytes, ACL='public-read')


@attr.s
class FSImageProvider(ImageProvider[np.ndarray]):
    async def get_image(self, key: str) -> np.ndarray:
        img = cv2.imread(key, cv2.IMREAD_COLOR)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGBA)
        return img

    async def save_image(self, img: np.ndarray, key: str) -> None:
        img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
        cv2.imwrite(key, img)
