import os
from setuptools import setup, find_packages


__version__ = "0.27.0"


PKG_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT_DIR = os.path.dirname(os.path.dirname(PKG_DIR)).strip("/")
setup(
    name="logo-api",
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
        "arq",
        "opencv-python==4.6.0.66",
        "einops",
        "scikit-image",
        "botocore==1.27.59",
        "aiobotocore==2.4.2",
        "aiofiles",
        "aiohttp",
        "awscli==1.25.60",
        "aioredis>=2.0.0",
        "marshmallow",
        "python-keycloak",
        "asyncpg",
        "timm",
    ] + [
        f"{name} @ file://localhost/{BACKEND_ROOT_DIR}/lib/{pydir}"
        for name, pydir in (
            ("logo-configs", "logo_configs"),
            ("logo-worker-interface", "logo_worker_interface"),
        )
    ],
    extras_require={
        "develop": [
            "pytest",
        ],
        "mypy": [
            "mypy",
        ],
    },
)
