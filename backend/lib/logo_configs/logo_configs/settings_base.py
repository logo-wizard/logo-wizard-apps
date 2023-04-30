from pydantic import BaseSettings


class SettingsBase(BaseSettings):
    """ Base settings for all apps """

    class Config:
        case_sensitive = True
        env_nested_delimiter = '__'
        env_prefix = ''
