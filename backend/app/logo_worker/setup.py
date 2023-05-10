import os
from setuptools import setup, find_packages


__version__ = "0.25.0"


PKG_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT_DIR = os.path.dirname(os.path.dirname(PKG_DIR)).strip("/")
setup(
    name="logo-worker",
    version=__version__,
    author="Aleksei Konstantinov",
    author_email="askonstantinov@edu.hse.ru",
    packages=find_packages(exclude=["tests*"]),
    zip_safe=False,
    include_package_data=True,
    entry_points={},
    install_requires=[
        "ipython",  # for debug
        "attrs>=19.2.0",
        "ujson",
        "botocore==1.27.59",
        "aiobotocore==2.4.2",
        "awscli==1.25.60",
        "aioredis>=2.0.0",
        "aiofiles",
        "click>=6.7",
        "pydantic>=1",
        "dataclasses>=0.6",
        "typing-extensions>=3.7",
        "arq",

        "numpy==1.23.1",
        "torch==1.13.1",
        "torchvision==0.14.1",
        "torchaudio==0.13.1",
        "albumentations==0.4.6",
        "opencv-python==4.6.0.66",
        "pudb==2019.2",
        "invisible-watermark",
        "imageio==2.9.0",
        "imageio-ffmpeg==0.4.2",
        "pytorch-lightning==1.4.2",
        "omegaconf==2.1.1",
        "test-tube>=0.7.5",
        "streamlit>=0.73.1",
        "einops==0.3.0",
        "torch-fidelity==0.3.0",
        "torchmetrics==0.6.0",
        "kornia==0.6",
        "ftfy",
        "regex",
        "tqdm",

        "diffusers>=0.14.0",
        "transformers",
        "accelerate",
        "xformers==0.0.16",  # NOTE having troubles installing this in docker on Mac, so uncomment when building image
                             #  Also sometimes needs to be installed separately when initializing local dev env
                             #  pip may act strange sometimes

        "openmim>=0.3.7",
    ] + [
        f"{name} @ file://localhost/{BACKEND_ROOT_DIR}/lib/{pydir}"
        for name, pydir in (
            ("logo-configs", "logo_configs"),
            ("logo-worker-interface", "logo_worker_interface"),
        )
    ] + [
        f"{name} @ file://localhost/{BACKEND_ROOT_DIR}/app/{pydir}"
        for name, pydir in (
            ("logo-api", "logo_api"),
        )
    ],
    extras_require={
        "develop": [
            "pytest",
            "pytest-asyncio",
        ],
        "mypy": [
            "mypy",
        ],
    },
)
