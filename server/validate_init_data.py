"""Валидация Telegram Mini App initData (HMAC-SHA256).

Чистая функция без фреймворков и без чтения окружения: bot_token передаётся
аргументом. Спека: docs/context/BACKEND-DECISION.md §1. Наружу не бросает —
всегда возвращает Result(ok=False, reason=...).
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import parse_qsl

FUTURE_SKEW_SECONDS = 60


@dataclass(slots=True)
class Result:
    ok: bool
    reason: str | None = None
    user_id: int | None = None
    auth_date: int | None = None


def _fail(reason: str, auth_date: int | None = None) -> Result:
    return Result(ok=False, reason=reason, user_id=None, auth_date=auth_date)


def _hmac_sha256(key: bytes, message: bytes) -> bytes:
    return hmac.new(key, message, hashlib.sha256).digest()


def validate_init_data(
    init_data: str,
    bot_token: str,
    ttl_seconds: int = 86400,
    now: int | None = None,
) -> Result:
    if not init_data or not bot_token:
        return _fail("invalid_input")

    try:
        pairs = parse_qsl(init_data, keep_blank_values=True)
    except (ValueError, TypeError):
        return _fail("invalid_input")

    received_hash: str | None = None
    rest: list[tuple[str, str]] = []
    for key, value in pairs:
        if key == "hash" and received_hash is None:
            received_hash = value
            continue
        rest.append((key, value))
    if not received_hash:
        return _fail("missing_hash")

    rest.sort(key=lambda item: item[0])
    data_check_string = "\n".join(f"{key}={value}" for key, value in rest).encode()

    secret = _hmac_sha256(b"WebAppData", bot_token.encode())
    calculated = _hmac_sha256(secret, data_check_string)

    try:
        received = bytes.fromhex(received_hash)
    except ValueError:
        return _fail("bad_signature")
    if not hmac.compare_digest(calculated, received):
        return _fail("bad_signature")

    raw_auth_date = next((value for key, value in rest if key == "auth_date"), None)
    if raw_auth_date is None:
        return _fail("missing_auth_date")
    try:
        auth_date = int(raw_auth_date)
    except (ValueError, TypeError):
        return _fail("missing_auth_date")

    current = int(time.time()) if now is None else now
    age = current - auth_date
    if age < -FUTURE_SKEW_SECONDS:
        return _fail("future_auth_date", auth_date)
    if age > ttl_seconds:
        return _fail("expired", auth_date)

    raw_user = next((value for key, value in rest if key == "user"), None)
    if raw_user is None:
        return _fail("missing_user", auth_date)
    try:
        user: Any = json.loads(raw_user)
    except (ValueError, TypeError):
        return _fail("missing_user", auth_date)
    if not isinstance(user, dict):
        return _fail("missing_user", auth_date)
    user_id = user.get("id")
    if not isinstance(user_id, int) or isinstance(user_id, bool):
        return _fail("missing_user", auth_date)

    return Result(ok=True, reason=None, user_id=user_id, auth_date=auth_date)
