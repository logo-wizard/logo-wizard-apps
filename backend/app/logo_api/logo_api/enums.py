from enum import Enum, auto


class LogoProcessingStatus(Enum):
    in_progress = 'in_progress'
    ready = 'ready'
    failed = 'failed'


class HandlerResource(Enum):
    SKIP_AUTH = auto()
    OPTIONAL_AUTH = auto()
