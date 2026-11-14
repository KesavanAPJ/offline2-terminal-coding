"""Central logging configuration."""

import logging
import sys

_LOG_FORMAT = "%(asctime)s %(levelname)-8s [%(name)s] %(message)s"
_configured = False


def setup_logging(level: str = "INFO") -> None:
    """Configure the root logger once with a console handler.

    Safe to call multiple times; subsequent calls only update the level.
    """
    global _configured
    root = logging.getLogger()
    numeric_level = logging.getLevelName(level.upper())
    if not isinstance(numeric_level, int):
        numeric_level = logging.INFO
    root.setLevel(numeric_level)
    if _configured:
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(_LOG_FORMAT))
    root.addHandler(handler)
    # Keep noisy third-party loggers quiet unless debugging.
    for noisy in ("apscheduler", "fontTools", "weasyprint", "botocore", "urllib3"):
        logging.getLogger(noisy).setLevel(max(numeric_level, logging.WARNING))
    _configured = True
