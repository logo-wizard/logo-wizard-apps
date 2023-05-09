import logging
import logging.config
import os
import socket
import sys

from logo_configs.logging_common import LOGMUTATORS, JsonExtFormatter


HOSTNAME = socket.getfqdn()


ENV_CONTEXT = {
    'app_name': None,  # filled in on configure.
    'hostname': HOSTNAME,
    'app_instance': os.environ.get('APP_INSTANCE', 'unspecified'),
    'app_version': os.environ.get('APP_VERSION', '0.0.0'),
}


_JSON_FORMATTER = JsonExtFormatter()


class StdoutFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        return _JSON_FORMATTER.format(record)


BASE_LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
    },
    'formatters': {
        'verbose': {'format': '[%(asctime)s] %(levelname)s: %(name)s: %(message)s'},
        'json': {'format': ''},
    },
    'handlers': {
        'stream': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
            'stream': sys.stdout,
            'level': 'DEBUG',
        },
        'stream_info': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
            'stream': sys.stdout,
            'level': 'INFO',
        },
        'stream_err': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
            'stream': sys.stdout,
            'level': 'ERROR',
        },
    },
    'loggers': {
    },
    'root': {
        'level': 'DEBUG',
        'handlers': [],
    },
}


def make_logging_config():
    base = BASE_LOGGING_CONFIG
    common_handlers = base['root']['handlers']

    default_handlers = (
        ['stream'] + common_handlers
    )
    logging_config = {
        **base,
        'filters': {
            **base.get('filters', {}),
        },
        'formatters': {
            **base.get('formatters', {}),
            'json': {'()': 'logo_configs.logging_config.StdoutFormatter'},
        },
        'handlers': {
            **(base.get('handlers') or {}),
        },
        'loggers': {
            **(base.get('loggers') or {}),
            # Set minimal level to some unhelpful libraries' logging:
            'asyncio': {'level': 'INFO', 'propagate': False, 'handlers': default_handlers},
            'botocore': {'level': 'INFO', 'propagate': False, 'handlers': default_handlers},
        },
        'root': {
            **(base.get('root') or {}),
            'handlers': default_handlers,
            'level': 'DEBUG',
        },
    }

    return logging_config


def add_env_context_logmutator(record):
    for key, val in ENV_CONTEXT.items():
        setattr(record, key, val)


def do_configure_logging(app_name, cfg, use_env_context=True) -> None:
    current_name = ENV_CONTEXT.get('app_name')
    if current_name is not None and current_name != app_name:
        raise Exception("Attempting to configure logging again with a different app name", current_name, app_name)

    ENV_CONTEXT['app_name'] = app_name

    logging.config.dictConfig(cfg)
    LOGMUTATORS.apply(require=False)
    if use_env_context:
        LOGMUTATORS.add_mutator('env_context', add_env_context_logmutator)


def configure_logging(app_name: str) -> None:
    cfg = make_logging_config()
    do_configure_logging(app_name=app_name, cfg=cfg)
