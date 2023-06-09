import logging

import asyncio
import uuid
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import cv2

import attr

from logo_api.enums import MaskType
from logo_api.utils.image_provider import ImageProvider


LOGGER = logging.getLogger(__name__)


def rounded_rectangle(src, top_left, bottom_right, radius=1., color=255, thickness=1, line_type=cv2.LINE_AA):
    p1 = top_left
    p2 = (bottom_right[1], top_left[1])
    p3 = (bottom_right[1], bottom_right[0])
    p4 = (top_left[0], bottom_right[0])

    height = abs(bottom_right[0] - top_left[1])

    if radius > 1:
        radius = 1

    corner_radius = int(radius * (height / 2))

    if thickness < 0:
        # big rect
        top_left_main_rect = (int(p1[0] + corner_radius), int(p1[1]))
        bottom_right_main_rect = (int(p3[0] - corner_radius), int(p3[1]))

        top_left_rect_left = (p1[0], p1[1] + corner_radius)
        bottom_right_rect_left = (p4[0] + corner_radius, p4[1] - corner_radius)

        top_left_rect_right = (p2[0] - corner_radius, p2[1] + corner_radius)
        bottom_right_rect_right = (p3[0], p3[1] - corner_radius)

        all_rects = [
            [top_left_main_rect, bottom_right_main_rect],
            [top_left_rect_left, bottom_right_rect_left],
            [top_left_rect_right, bottom_right_rect_right]]

        [cv2.rectangle(src, rect[0], rect[1], color, thickness) for rect in all_rects]

    # draw straight lines
    cv2.line(src, (p1[0] + corner_radius, p1[1]), (p2[0] - corner_radius, p2[1]), color, abs(thickness), line_type)
    cv2.line(src, (p2[0], p2[1] + corner_radius), (p3[0], p3[1] - corner_radius), color, abs(thickness), line_type)
    cv2.line(src, (p3[0] - corner_radius, p4[1]), (p4[0] + corner_radius, p3[1]), color, abs(thickness), line_type)
    cv2.line(src, (p4[0], p4[1] - corner_radius), (p1[0], p1[1] + corner_radius), color, abs(thickness), line_type)

    # draw arcs
    cv2.ellipse(src, (p1[0] + corner_radius, p1[1] + corner_radius), (corner_radius, corner_radius), 180.0, 0, 90,
                color, thickness, line_type)
    cv2.ellipse(src, (p2[0] - corner_radius, p2[1] + corner_radius), (corner_radius, corner_radius), 270.0, 0, 90,
                color, thickness, line_type)
    cv2.ellipse(src, (p3[0] - corner_radius, p3[1] - corner_radius), (corner_radius, corner_radius), 0.0, 0, 90, color,
                thickness, line_type)
    cv2.ellipse(src, (p4[0] + corner_radius, p4[1] - corner_radius), (corner_radius, corner_radius), 90.0, 0, 90, color,
                thickness, line_type)

    return src


def add_mask(img: np.ndarray, mask_type: MaskType) -> np.ndarray:
    """ Draws a blurred (for smooth edges) mask and replaces the input image alpha channel with it """

    w, h = img.shape[:2]

    mask = np.zeros((h, w), np.uint8)
    mask_margin = 10

    if mask_type == MaskType.circle:
        fancy_mask = cv2.circle(mask, (w // 2, h // 2), w // 2 - mask_margin, (255, 255, 255), thickness=-1)
    elif mask_type == MaskType.round_rect:
        fancy_mask = rounded_rectangle(
            mask,
            (mask_margin, mask_margin),
            (w - mask_margin, h - mask_margin),
            radius=0.15,
            thickness=-1,
        )
    else:
        fancy_mask = rounded_rectangle(
            mask,
            (mask_margin, mask_margin),
            (w - mask_margin, h - mask_margin),
            radius=0,
            thickness=-1,
        )

    fancy_mask = cv2.blur(fancy_mask, (20, 20))

    masked_res = img.copy()
    masked_res[..., -1] = fancy_mask

    return masked_res


def make_transform(img: np.ndarray, output_pts: np.ndarray) -> np.ndarray:
    w, h = img.shape[0], img.shape[1]
    input_pts = np.float32([[0, 0], [w, 0], [w, h], [0, h]])

    # Compute the perspective transform M
    transform = cv2.getPerspectiveTransform(input_pts, output_pts)

    # Apply the perspective transformation to the image
    transformed = cv2.warpPerspective(img, transform, (img.shape[1], img.shape[0]), flags=cv2.INTER_CUBIC)

    return transformed


def make_mockup(
        mockup_background: np.ndarray,
        image: np.ndarray,
        result_transform: list[np.ndarray],
) -> np.ndarray:
    if mockup_background.shape[0] != mockup_background.shape[1]:
        raise ValueError('Only square images for mockups are supported')
    mockup_size = mockup_background.shape[0]
    resized_img = cv2.resize(image, (mockup_size, mockup_size), interpolation=cv2.INTER_CUBIC)
    masked_img = add_mask(resized_img, MaskType.circle)  # TODO let the user control mask type

    transformed_imgs = [make_transform(masked_img, transform * mockup_size) for transform in result_transform]
    result = np.copy(mockup_background)

    for transformed_img in transformed_imgs:
        img_mask = transformed_img[..., -1]

        mask = 255 - img_mask
        if len(mask.shape) != 4:
            mask = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGRA)

        result = ((mask / 255 * result) + ((255 - mask) / 255 * transformed_img)).astype(np.uint8)

    return result


@attr.s
class MockupConfig:
    bg_key: str = attr.ib()
    transforms: list[np.ndarray] = attr.ib()  # coordinates in range 0..1


_MOCKUP_CONFIGS: list[MockupConfig] = [  # TODO make this configurable from env
    MockupConfig(
        bg_key='mockup_bg/phone-tablet-mac-1024.jpeg',
        transforms=[
            np.float32([[0.46875, 0.25390625],
                        [0.859375, 0.15039062],
                        [0.8066406, 0.6171875],
                        [0.41601562, 0.64453125]]),
            np.float32([[0.15625, 0.60546875],
                        [0.29296875, 0.60546875],
                        [0.29296875, 0.7421875],
                        [0.15625, 0.7421875]]),
            np.float32([[0.04492188, 0.7910156],
                        [0.12304688, 0.7910156],
                        [0.12304688, 0.8691406],
                        [0.04492188, 0.8691406]])

        ],
    ),
    MockupConfig(
        bg_key='mockup_bg/paper-bag-sq-1024.jpeg',
        transforms=[
            np.float32([
                [0.38085938, 0.4296875],
                [0.6933594, 0.36132812],
                [0.7128906, 0.6542969],
                [0.40039062, 0.7421875]]),
        ],
    ),
    MockupConfig(
        bg_key='mockup_bg/brick-wall-sign-1024.jpeg',
        transforms=[
            np.float32([
                [0.38085938, 0.34179688],
                [0.6230469, 0.37304688],
                [0.6230469, 0.625],
                [0.38085938, 0.6015625]]),
        ],
    ),
    MockupConfig(
        bg_key='mockup_bg/cardboard-box-1024.jpeg',
        transforms=[
            np.float32([
                [0.30273438, 0.41601562],
                [0.5058594, 0.43359375],
                [0.5058594, 0.640625],
                [0.30273438, 0.6191406]]),
        ],
    ),
]


async def create_mockups_for_image(key: str, image_provider: ImageProvider, tpe: ThreadPoolExecutor) -> list[str]:
    """
    Creates mockups for the image `key` using the pre-defined config, uses `image_provider` to get/save the image
    """

    mockups_res_keys: list[str] = []
    loop = asyncio.get_running_loop()

    orig_img = await image_provider.get_image(key)

    for mockup_config in _MOCKUP_CONFIGS:
        mockup_bg = await image_provider.get_image(mockup_config.bg_key)

        result = await loop.run_in_executor(tpe, make_mockup, mockup_bg, orig_img, mockup_config.transforms)

        mockup_res_key = f'mockup_{uuid.uuid4()}.png'
        await image_provider.save_image(result, mockup_res_key)

        mockups_res_keys.append(mockup_res_key)

    return mockups_res_keys
