import abc
import logging
import math

import asyncio
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

import numpy as np
import cv2

import attr
from aiobotocore.session import get_session
from aiohttp import ClientSession, ClientTimeout


LOGGER = logging.getLogger(__name__)


class ImageProvider(metaclass=abc.ABCMeta):
    @abc.abstractmethod
    async def get_image(self, key: str) -> np.ndarray:
        raise NotImplementedError

    @abc.abstractmethod
    async def save_image(self, img: np.ndarray, key: str) -> None:
        raise NotImplementedError


@attr.s
class S3ImageProvider(ImageProvider):
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


def alpha_circle(img: np.ndarray) -> np.ndarray:
    w, h = img.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    circle_img = cv2.circle(mask, (w // 2, h // 2), w // 2, (255, 255, 255), thickness=-1)
    masked_data = cv2.bitwise_and(img, img, mask=circle_img)

    mask = np.zeros((h, w, 3), np.uint8)
    circle_img = cv2.circle(mask, (w // 2, h // 2), w // 2, (255, 255, 255), thickness=-1)
    alpha = np.sum(circle_img, axis=-1) > 0

    # Convert True/False to 0/255 and change type to "uint8" to match "na"
    alpha = np.uint8(alpha * 255)
    # alpha = 255 - alpha  # TODO can be used for debug

    # Stack new alpha layer with existing image to go from BGR to BGRA, i.e. 3 channels to 4 channels
    # res = np.dstack((masked_data, alpha))
    masked_data[..., -1] = alpha
    return masked_data


def make_transform(img: np.ndarray, output_pts: np.ndarray) -> np.ndarray:
    w, h = img.shape[0], img.shape[1]
    input_pts = np.float32([[0, 0], [w, 0], [w, h], [0, h]])

    # Compute the perspective transform M
    transform = cv2.getPerspectiveTransform(input_pts, output_pts)

    # Apply the perspective transformation to the image
    transformed = cv2.warpPerspective(img, transform, (img.shape[1], img.shape[0]), flags=cv2.INTER_LINEAR)

    return transformed


def transform_pts_from_cfg(
        center: tuple[int, int],
        radius: int,
        perspective: Optional[tuple[Optional[int], Optional[int]]] = None,
        shrink: Optional[tuple[int, int, int, int]] = None,
) -> np.ndarray:
    x1, y1 = center[0] - radius, center[1] - radius
    x2, y2 = center[0] + radius, center[1] - radius
    x3, y3 = center[0] + radius, center[1] + radius
    x4, y4 = center[0] - radius, center[1] + radius
    a_top = x2 - x1
    a_right = y3 - y2
    a_bottom = x3 - x4
    a_left = y4 - y1

    if shrink is not None:
        shrink_top_half = shrink[0] / 2
        x1 += shrink_top_half
        x2 -= shrink_top_half

        shrink_bottom_half = shrink[2] / 2
        x3 -= shrink_bottom_half
        x4 += shrink_bottom_half

        dx = abs(x2 - x3)
        dy = abs(y2 - y3)
        c = math.sqrt(dx ** 2 + dy ** 2)
        shrink_right_half = shrink[1] / 2
        dyy = shrink_right_half * a_right / c
        dxx = shrink_right_half * (shrink[2] / 2) / c
        x2, y2 = x2 - dxx, y2 + dyy
        x3, y3 = x3 + dxx, y3 - dyy

        # dx = abs(x1 - x4)
        # dy = abs(y1 - y4)
        # c = math.sqrt(dx ** 2 + dy ** 2)
        # shrink_left_half = shrink[3] / 2
        # dyy = shrink_left_half * a_left / c
        # dxx = shrink_left_half * (shrink[0] / 2) / c
        # x1, y1 = x1 + dxx, y1 + dyy
        # x4, y4 = x3 - dxx, y3 + dyy

    if perspective is not None:
        if perspective[0] is not None:
            half_persp_x = perspective[0] / 2
            x1 += half_persp_x
            x2 += half_persp_x
            x3 -= half_persp_x
            x4 -= half_persp_x

        if perspective[1] is not None:
            half_persp_y = perspective[1] / 2
            y1 += half_persp_y
            y2 -= half_persp_y
            y3 -= half_persp_y
            y4 += half_persp_y

    return np.float32([[x1, y1], [x2, y2], [x3, y3], [x4, y4]])


def make_mockup(
        mockup_background: np.ndarray,
        image: np.ndarray,
        result_transform: list[np.ndarray],
) -> np.ndarray:
    m_w, m_h = mockup_background.shape[0], mockup_background.shape[1]
    resized_img = cv2.resize(image, (m_w, m_h), interpolation=cv2.INTER_CUBIC)

    circle_img = alpha_circle(resized_img)

    transformed_imgs = [make_transform(circle_img, transform) for transform in result_transform]

    mockup_copy = np.copy(mockup_background)
    for transformed_img in transformed_imgs:
        alpha = transformed_img[..., -1]
        mock_alpha2 = 255 - np.dstack((alpha, alpha, alpha, alpha))

        mock_actual = cv2.bitwise_and(mockup_copy, mock_alpha2)

        mockup_copy = cv2.addWeighted(mock_actual, 1, transformed_img, 0.96, 0)

    return mockup_copy


async def main(s3_key: str, image_provider: ImageProvider, tpe: ThreadPoolExecutor) -> list[str]:
    # TODO generalize mockup creation

    mockups_s3_keys: list[str] = []
    loop = asyncio.get_running_loop()

    orig_img = await image_provider.get_image(s3_key)

    mockup_bg = await image_provider.get_image('mockup_bg/phone-tablet-mac.png')
    mockup_bg = cv2.resize(mockup_bg, (512, 512), interpolation=cv2.INTER_CUBIC)

    result = await loop.run_in_executor(
        tpe,
        make_mockup,
        mockup_bg,
        orig_img,
        [
            transform_pts_from_cfg(center=(330, 220), radius=100, perspective=(20, 20), shrink=(0, -20, 0, 0)),
            transform_pts_from_cfg(center=(115, 345), radius=35),
            transform_pts_from_cfg(center=(43, 425), radius=20),
        ],
    )

    mockup_s3_key = f'mockup_{uuid.uuid4()}.png'
    await image_provider.save_image(result, mockup_s3_key)
    mockups_s3_keys.append(mockup_s3_key)

    ###
    mockup_bg = await image_provider.get_image('mockup_bg/paper-bag-sq.png')
    mockup_bg = cv2.resize(mockup_bg, (512, 512), interpolation=cv2.INTER_CUBIC)

    result = await loop.run_in_executor(
        tpe,
        make_mockup,
        mockup_bg,
        orig_img,
        [transform_pts_from_cfg(center=(285, 280), radius=80, perspective=(-20, 40), shrink=(0, 10, 0, -40))],
    )

    mockup_s3_key = f'mockup_{uuid.uuid4()}.png'
    await image_provider.save_image(result, mockup_s3_key)
    mockups_s3_keys.append(mockup_s3_key)

    return mockups_s3_keys
