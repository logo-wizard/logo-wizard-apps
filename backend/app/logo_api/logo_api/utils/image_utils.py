import base64

import cv2
import numpy as np


def image_to_png_data_url(img: np.ndarray) -> str:
    _, buffer = cv2.imencode('.png', img)
    data_url = 'data:image/png;base64,' + base64.b64encode(buffer).decode('utf-8')
    return data_url
