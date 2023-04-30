from logo_configs.settings_base import SettingsBase
from logo_configs.settings_submodels import RedisSettings, S3Settings


class LogoSettingsCommon(SettingsBase):
    REDIS_ARQ: RedisSettings = RedisSettings(
        HOST='localhost',
        PORT=6379,
        DB=0,
        PASSWORD=None,
        SSL=False,
        CERT_PATH=None,
    )

    REDIS_MISC: RedisSettings = RedisSettings(
        HOST='localhost',
        PORT=6379,
        DB=1,
        PASSWORD=None,
        SSL=False,
        CERT_PATH=None,
    )

    S3: S3Settings = S3Settings(
        HOST='localhost:3030',
        BUCKET='s3-logo',
        ACCESS_KEY_ID='default_access_key_id',
        SECRET_KEY='default_secret_key',
    )

    class Config(SettingsBase.Config):
        pass
