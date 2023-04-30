from setuptools import setup, find_packages


__version__ = "0.1.0"


SETUP_KWARGS = dict(
    name="logo-configs",
    author="Aleksei Konstantinov",
    author_email="askonstantinov@edu.hse.ru",
    packages=find_packages(exclude=["tests*"]),
    zip_safe=False,
    include_package_data=True,
    entry_points={},
    install_requires=[
        "pydantic",
    ],
    extras_require={
        "tests": [
            # "shortuuid",
        ]
    },
)
SETUP_KWARGS["extras_require"]["all"] = sorted(set(
    pkg for lst in SETUP_KWARGS["extras_require"].values() for pkg in lst
))


if __name__ == "__main__":
    setup(**SETUP_KWARGS)
