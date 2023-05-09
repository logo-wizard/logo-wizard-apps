from collections import OrderedDict
import datetime
import json
import logging
import logging.handlers
import traceback
from typing import Callable


FILE_FORMAT = '%(asctime)s %(name)-15s %(levelname)-10s %(message)s'
DT_FORMAT = '%Y-%m-%d %H:%M:%S.%f'


def smart_str(value):
    if isinstance(value, str):
        return value
    if isinstance(value, bytes):
        return value.decode('utf-8', 'replace')
    return str(value)


def robust_smart_str(value, default='???'):
    try:
        return smart_str(value)
    except Exception:
        return default


class RecordDataFormatterMixin:

    unspecified = object()

    default_skipped_record_attrs = (
        # 'name',  # 'root',
        'msg',  # 'Example logged error: %r',
        'args',  # (ZeroDivisionError('division by zero'),),
        # 'levelname',  # 'ERROR',
        'levelno',  # 40,
        'pathname',  # 'tmpf.py',
        'filename',  # 'tmpf.py',
        'module',  # 'tmpf',
        # # covered by the func-based attr.
        # 'exc_info',  # (ZeroDivisionError, ZeroDivisionError('division by zero'), <traceback at 0x7f21bdc5b7c8>),
        'exc_text',  # None,
        'stack_info',  # None,
        # 'lineno',  # 11,
        # 'funcName',  # '<module>',
        'created',  # 1575299079.958725,
        'msecs',  # 958.7249755859375,
        'relativeCreated',  # 16066.834449768066,
        'thread',  # 139783057811200,
        'threadName',  # 'MainThread',
        'processName',  # 'MainProcess',
        'process',  # 409783}

        # func-based:
        # 'timestamp',
        # 'timestampns',
        # 'isotimestamp',
        # 'message',
        # 'pid',
        # 'exc_type',
        # 'exc',
    )

    func_based_record_attrs = (
        # `self.get_record_...(record)`
        # Some of them are simple renames ('timestamp', 'pid')
        'timestamp', 'timestampns', 'isotimestamp',
        'message', 'pid',
        'exc_type', 'exc_info',
    )

    @staticmethod
    def get_record_timestamp(record):
        return record.created

    @staticmethod
    def get_record_timestampns(record, ns=int(1e9)):
        return int(record.created * ns)

    @staticmethod
    def get_record_isotimestamp(record, fmt=DT_FORMAT):
        dt = datetime.datetime.fromtimestamp(record.created)
        return dt.strftime(fmt)

    @staticmethod
    def get_record_message(record):
        return record.getMessage()

    @staticmethod
    def get_record_pid(record):
        return record.process

    @staticmethod
    def get_record_exc_type(record):
        if not record.exc_info:
            return None
        if not isinstance(record.exc_info, tuple):
            return None
        return record.exc_info[0].__name__

    @staticmethod
    def get_record_exc_info(record):
        exc_info = record.exc_info
        if exc_info is None:
            return None
        if not isinstance(exc_info, tuple):
            return exc_info

        _, exc, _ = exc_info
        exc_info_formatted = "".join(
            smart_str(val)
            for val in traceback.format_exception(*exc_info))

        # str(exc) at the beginning for some readability.
        return "{}\n{}".format(
            robust_smart_str(exc),
            exc_info_formatted)

    def __init__(self, skipped_record_attrs=unspecified):
        if skipped_record_attrs is self.unspecified:
            skipped_record_attrs = self.default_skipped_record_attrs
        self.skipped_record_attrs = frozenset(skipped_record_attrs)

    def record_to_data(self, record):
        """ Make items dict from the record """

        skiplist = self.skipped_record_attrs
        result = {}

        result.update({
            key: val
            for key, val in vars(record).items()
            if key not in skiplist})

        for name in self.func_based_record_attrs:
            if name not in skiplist:
                func = getattr(self, 'get_record_{}'.format(name))
                result[name] = func(record)

        return result


class JsonExtFormatter(RecordDataFormatterMixin, logging.Formatter):

    def format(self, record):
        log_data = self.record_to_data(record)
        return self.dumps(log_data)

    @staticmethod
    def dumps(data):
        return json.dumps(data, default=robust_smart_str)


class RecordMutators:
    def __init__(self):
        self.mutators = OrderedDict()
        self.old_factory = None

    def apply(self, require=True):
        """
        Wrap the current log record factory.
        Should only be done once.
        """
        if self.old_factory is not None:
            if require:
                raise Exception("This mutators-wrapper was already `apply`ed.")
            return
        self.old_factory = logging.getLogRecordFactory()
        logging.setLogRecordFactory(self)

    def add_mutator(self, name: str, mutator: Callable[[object], None], force=False):
        """
        Register a mutator.
        `name` is required to ensure idempotency.
        """
        if not force:
            current = self.mutators.get(name)
            if current is not None and current is not mutator:
                raise ValueError("Attempting to replace an existing mutator", name, current, mutator)
        self.mutators[name] = mutator

    def __call__(self, *args, **kwargs):
        """ Log record factrory entry point """
        if self.old_factory is None:
            raise Exception("This mutators-wrapper was not `apply`ed yet.")
        record = self.old_factory(*args, **kwargs)
        for mutator in self.mutators.values():
            mutator(record)
        return record


LOGMUTATORS = RecordMutators()
