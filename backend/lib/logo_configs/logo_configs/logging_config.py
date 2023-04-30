import logging
import logging.config
import os
import socket
import sys

from logo_configs.logging_common import LOGMUTATORS, JsonExtFormatter


# Warning: an on-import network request; if there's a danger of a broken DNS
# setup, use `socket.gethostname()`.
HOSTNAME = socket.getfqdn()


ENV_CONTEXT = {
    'app_name': None,  # To be filled in on configure.
    'hostname': HOSTNAME,
    'app_instance': os.environ.get('APP_INSTANCE', 'unspecified'),
    'app_version': os.environ.get('APP_VERSION', '0.0.0'),
}


class FastlogsFilter(logging.Filter):

    def filter(self, record):

        event_code = getattr(record, 'event_code', None)
        if event_code:
            if isinstance(event_code, str) and event_code.startswith('_'):
                pass
            else:
                return True

        # ...

        return False


_JSON_FORMATTER = JsonExtFormatter()


class StdoutFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        return _JSON_FORMATTER.format(record)


def make_file_logger_syslog(name, params=None, **kwargs):
    addr = '/dev/log-ext'
    if not os.path.exists(addr):
        addr = '/dev/log'
        if not os.path.exists(addr):
            return {'class': 'logging.NullHandler'}

    res = {
        'class': 'logo_configs.logging_common.TaggedSysLogHandler',
        'address': addr,
        'syslog_tag': 'file__' + name,
    }
    if params:
        res.update(params)
    res.update(kwargs)
    return res


BASE_LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'events': {'()': 'logging.Filter', 'name': 'events'},
        'fastlogs': {'()': 'logging.Filter', 'name': 'fastlogs'},
    },
    'formatters': {
        'verbose': {'format': '[%(asctime)s] %(levelname)s: %(name)s: %(message)s'},
        # Put any preferred stdout/stderr json formatter in there:
        'json': {'format': ''},
        'jsonext': {'()': 'logo_configs.logging_common.JsonExtFormatter'},
        'jsonevent': {'()': 'logo_configs.logging_common.JsonEventFormatter'},
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
        'debug_log': make_file_logger_syslog(
            'debug',
            formatter='jsonext',
            level='DEBUG',
        ),
        'fast_log': make_file_logger_syslog(
            'fast',
            formatter='jsonext',
            level='DEBUG',
            # Ways to use these:
            #  * Use logging.getLogger('fastlogs')
            #  * Replace the `filters` setting with your own.
            filters=['fastlogs'],
        ),
        'event_log': make_file_logger_syslog(
            'event',
            formatter='jsonevent',
            level='DEBUG',
            filters=['events'],
        ),
    },
    'loggers': {
    },
    'root': {
        'level': 'DEBUG',
        'handlers': ['debug_log', 'fast_log', 'event_log'],
    },
}


def make_logging_config():
    base = BASE_LOGGING_CONFIG
    # Handlers for root and for every non-propagated logger
    common_handlers = base['root']['handlers']  # type: ignore  # TODO: fix
    # ^ ['debug_log', 'fast_log', 'event_log']

    # if sentry_dsn:
    #     common_handlers += ['sentry']

    default_handlers = (
            ['stream'] +  # everything to stdout
            common_handlers
    )
    logging_config = {
        **base,
        'filters': {
            **base.get('filters', {}),  # type: ignore  # TODO: fix
            'fastlogs': {'()': 'logo_configs.logging_config.FastlogsFilter'},
        },
        'formatters': {
            **base.get('formatters', {}),  # type: ignore  # TODO: fix
            'json': {'()': 'logo_configs.logging_config.StdoutFormatter'},
        },
        'handlers': {
            **(base.get('handlers') or {}),  # type: ignore  # TODO: fix
            # **({} if not sentry_dsn else {'sentry': {  # type: ignore  # TODO: fix
            #     'class': 'raven.handlers.logging.SentryHandler',
            #     'processors': ('bi_core.api_commons.logging_sentry.SecretsCleanupProcessor',),
            #     'level': 'ERROR',
            #     'formatter': 'verbose',
            #     'dsn': sentry_dsn,
            # }}),
        },
        'loggers': {
            **(base.get('loggers') or {}),  # type: ignore  # TODO: fix
            # Set minimal level to some unhelpful libraries' logging:
            'asyncio': {'level': 'INFO', 'propagate': False, 'handlers': default_handlers},
            'botocore': {'level': 'INFO', 'propagate': False, 'handlers': default_handlers},
        },
        'root': {
            **(base.get('root') or {}),  # type: ignore  # TODO: fix
            'handlers': default_handlers,
            'level': 'DEBUG',
        },
    }

    return logging_config


def add_env_context_logmutator(record):
    for key, val in ENV_CONTEXT.items():
        setattr(record, key, val)


def do_configure_logging(app_name, cfg, use_env_context=True) -> None:  # TODO rename
    current_name = ENV_CONTEXT.get('app_name')
    if current_name is not None and current_name != app_name:
        raise Exception("Attempting to configure logging again with a different app name", current_name, app_name)

    ENV_CONTEXT['app_name'] = app_name

    logging.config.dictConfig(cfg)
    LOGMUTATORS.apply(require=False)
    if use_env_context:
        LOGMUTATORS.add_mutator('env_context', add_env_context_logmutator)


def configure_logging(
    app_name: str,
    # env=None, app_prefix=None, sentry_dsn=None, logcfg_processors=None,
    # use_jaeger_tracer: bool = False,
    # jaeger_service_name: Optional[str] = None,
) -> None:
    """
    Make sure the global logging state is configured.

    Mostly idempotent but does some checks to ensure the configuration has not changed.

    `app_prefix` is not currently used; see `REQUEST_ID_APP_PREFIX` instead.

    `logcfg_processors`: convenient (but dangerous) processing of the logging config.
    Iterable of Callables `(log_cfg, **context) -> log_cfg`.
    Context includes `common_handlers`.
    Example: see `logcfg_process_enable_handler`.
    """
    cfg = make_logging_config(
        # env=env,
        # sentry_dsn=sentry_dsn,
        # logcfg_processors=logcfg_processors
    )
    do_configure_logging(app_name=app_name, cfg=cfg)
