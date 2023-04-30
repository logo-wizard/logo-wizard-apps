from logo_api.base_settings import LogoSettingsCommon
from logo_configs.settings_submodels import CORSSettings, KeycloakSettings, PostgresSettings, ColorizationSettings


class ApiSettings(LogoSettingsCommon):

    CORS: CORSSettings = CORSSettings(
        ALLOW_ORIGINS=('*',),
        ALLOW_HEADERS=('DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT'),
        ALLOW_METHODS=('Origin', 'X-Requested-With', 'Content-Type', 'Accept'),
        ALLOW_CREDENTIALS=True,
        EXPOSED_ROUTES=('/api/v1/ping',),
    )

    KEYCLOAK: KeycloakSettings = KeycloakSettings(
        HOST='localhost',
        REALM='logo',
        CLIENT_ID='logo-backend',
        CLIENT_SECRET_KEY='...',
        CLIENT_PUBLIC_KEY='...',
        ADMIN_USERNAME='admin',
        ADMIN_PASSWORD='admin',
    )

    PG: PostgresSettings = PostgresSettings(
        HOST='localhost',
        PORT=5432,
        USERNAME='postgres',
        PASSWORD='...',
        DB_NAME='logodb',
    )

    COLORIZATION: ColorizationSettings = ColorizationSettings(
        MOCK=False,
        MODEL_DIR='',
        MODEL_FILENAME='',
    )

    class Config(LogoSettingsCommon.Config):
        pass
