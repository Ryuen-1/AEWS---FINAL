"""SlowAPI compatibility with Python 3.14+ coroutine detection.

SlowAPI 0.1.10 still calls the deprecated asyncio.iscoroutinefunction.
Give only that dependency a module-local view using the supported predicate;
the standard asyncio module and warning filters remain untouched.
"""
import inspect

import slowapi.extension as _extension
from slowapi import Limiter


class _AsyncioCompat:
    def __init__(self, original):
        self._original = original

    def __getattr__(self, name):
        return getattr(self._original, name)

    @staticmethod
    def iscoroutinefunction(function):
        # Preserve legacy @asyncio.coroutine markers supported by SlowAPI.
        from asyncio import coroutines
        marker = getattr(coroutines, "_is_coroutine", None)
        return inspect.iscoroutinefunction(function) or (
            marker is not None and getattr(function, "_is_coroutine", None) is marker
        )


if not isinstance(_extension.asyncio, _AsyncioCompat):
    _extension.asyncio = _AsyncioCompat(_extension.asyncio)
