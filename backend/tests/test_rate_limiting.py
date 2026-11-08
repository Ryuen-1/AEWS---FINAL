"""Ensure coroutine compatibility preserves sync/async rate enforcement."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import asyncio
import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from app.rate_limiting import Limiter


@pytest.mark.parametrize("asynchronous", [False, True])
def test_rate_limits_sync_and_async_routes(asynchronous):
    limiter = Limiter(key_func=get_remote_address)
    app = FastAPI()
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    async def async_endpoint(request: Request):
        return {"ok": True}

    def sync_endpoint(request: Request):
        return {"ok": True}

    endpoint = async_endpoint if asynchronous else sync_endpoint
    app.get("/limited")(limiter.limit("1/minute")(endpoint))
    client = TestClient(app)
    assert client.get("/limited").status_code == 200
    assert client.get("/limited").status_code == 429


def test_compatibility_does_not_replace_standard_asyncio():
    from app.rate_limiting import _AsyncioCompat
    import slowapi.extension as extension
    assert isinstance(extension.asyncio, _AsyncioCompat)
    assert extension.asyncio.iscoroutinefunction is not asyncio.iscoroutinefunction
