from typing import Optional, ClassVar

from pydantic import BaseModel, validator


class BaseSubModel(BaseModel):
    _comma_separated_fields: ClassVar[tuple[str, ...]] = tuple()

    @staticmethod
    def from_comma_separated(value):
        print(value, type(value))
        if isinstance(value, str):
            return [item.strip() for item in value.split(",")]
        return value


class RedisSettings(BaseModel):
    HOST: str
    PORT: int
    DB: int
    PASSWORD: Optional[str]
    SSL: bool
    CERT_PATH: Optional[str]


class S3Settings(BaseModel):
    HOST: str
    BUCKET: str
    ACCESS_KEY_ID: str
    SECRET_KEY: str


class CORSSettings(BaseSubModel):
    _comma_separated_fields = ('ALLOW_ORIGINS', 'ALLOW_HEADERS', 'ALLOW_METHODS', 'EXPOSED_ROUTES')

    ALLOW_ORIGINS: tuple[str, ...]
    ALLOW_HEADERS: tuple[str, ...]
    ALLOW_METHODS: tuple[str, ...]
    ALLOW_CREDENTIALS: bool
    EXPOSED_ROUTES: tuple[str, ...]

    @validator(*_comma_separated_fields, pre=True)
    def val(value):
        return BaseSubModel.from_comma_separated(value)


class KeycloakSettings(BaseSubModel):
    HOST: str
    REALM: str
    CLIENT_ID: str
    CLIENT_SECRET_KEY: str
    CLIENT_PUBLIC_KEY: str
    ADMIN_USERNAME: str
    ADMIN_PASSWORD: str


class PostgresSettings(BaseSubModel):
    HOST: str
    PORT: int
    USERNAME: str
    PASSWORD: str
    DB_NAME: str


class ColorizationSettings(BaseModel):
    MOCK: bool
    MODEL_DIR: str
    MODEL_FILENAME: str
