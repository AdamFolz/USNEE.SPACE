import hashlib
import hmac
import json
from urllib.parse import urlencode

from server.validate_init_data import validate_init_data

TOKEN = "123456:TEST-token_ABCDEF"
NOW = 1_700_000_000


def sign(pairs: list[tuple[str, str]], token: str = TOKEN) -> str:
    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(pairs, key=lambda item: item[0]))
    secret = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    return hmac.new(secret, data_check_string.encode(), hashlib.sha256).hexdigest()


def build(pairs: list[tuple[str, str]], token: str = TOKEN) -> str:
    return urlencode([*pairs, ("hash", sign(pairs, token))])


def base_pairs(**overrides: str) -> list[tuple[str, str]]:
    values = {
        "auth_date": str(NOW),
        "query_id": "AAHtest",
        "user": json.dumps({"id": 4242, "first_name": "Иван", "username": "ivan"}),
    }
    values.update(overrides)
    return list(values.items())


def test_valid_init_data_returns_user_id() -> None:
    result = validate_init_data(build(base_pairs()), TOKEN, now=NOW)
    assert result.ok is True
    assert result.user_id == 4242
    assert result.auth_date == NOW
    assert result.reason is None


def test_field_order_does_not_matter() -> None:
    result = validate_init_data(build(list(reversed(base_pairs()))), TOKEN, now=NOW)
    assert result.ok is True


def test_blank_value_is_kept() -> None:
    result = validate_init_data(build(base_pairs(query_id="")), TOKEN, now=NOW)
    assert result.ok is True


def test_duplicate_key_is_signed() -> None:
    result = validate_init_data(build([*base_pairs(), ("query_id", "second")]), TOKEN, now=NOW)
    assert result.ok is True


def test_url_encoded_values_are_decoded_before_check() -> None:
    result = validate_init_data(build(base_pairs(user=json.dumps({"id": 7, "first_name": "Иван Петров"}))), TOKEN, now=NOW)
    assert result.ok is True


def test_missing_hash() -> None:
    result = validate_init_data(urlencode(base_pairs()), TOKEN, now=NOW)
    assert result.ok is False
    assert result.reason == "missing_hash"


def test_broken_hash() -> None:
    signed = build(base_pairs())
    broken = signed.replace(sign(base_pairs()), "zzzz")
    result = validate_init_data(broken, TOKEN, now=NOW)
    assert result.ok is False
    assert result.reason == "bad_signature"


def test_tampered_field() -> None:
    result = validate_init_data(build(base_pairs()).replace("4242", "9999"), TOKEN, now=NOW)
    assert result.ok is False
    assert result.reason == "bad_signature"


def test_foreign_token() -> None:
    result = validate_init_data(build(base_pairs(), "other:token"), TOKEN, now=NOW)
    assert result.ok is False
    assert result.reason == "bad_signature"


def test_expired_auth_date() -> None:
    result = validate_init_data(build(base_pairs(auth_date=str(NOW - 86401))), TOKEN, now=NOW)
    assert result.ok is False
    assert result.reason == "expired"


def test_future_auth_date_beyond_skew() -> None:
    result = validate_init_data(build(base_pairs(auth_date=str(NOW + 61))), TOKEN, now=NOW)
    assert result.ok is False
    assert result.reason == "future_auth_date"


def test_future_within_skew_is_allowed() -> None:
    result = validate_init_data(build(base_pairs(auth_date=str(NOW + 60))), TOKEN, now=NOW)
    assert result.ok is True


def test_missing_auth_date() -> None:
    pairs = [pair for pair in base_pairs() if pair[0] != "auth_date"]
    result = validate_init_data(build(pairs), TOKEN, now=NOW)
    assert result.ok is False
    assert result.reason == "missing_auth_date"


def test_non_numeric_auth_date() -> None:
    result = validate_init_data(build(base_pairs(auth_date="yesterday")), TOKEN, now=NOW)
    assert result.ok is False
    assert result.reason == "missing_auth_date"


def test_missing_user() -> None:
    pairs = [pair for pair in base_pairs() if pair[0] != "user"]
    result = validate_init_data(build(pairs), TOKEN, now=NOW)
    assert result.ok is False
    assert result.reason == "missing_user"


def test_user_without_id() -> None:
    result = validate_init_data(build(base_pairs(user=json.dumps({"first_name": "Без id"}))), TOKEN, now=NOW)
    assert result.ok is False
    assert result.reason == "missing_user"


def test_broken_user_json() -> None:
    result = validate_init_data(build(base_pairs(user="{not json")), TOKEN, now=NOW)
    assert result.ok is False
    assert result.reason == "missing_user"


def test_garbage_does_not_raise() -> None:
    assert validate_init_data("%%%", TOKEN, now=NOW).ok is False
    assert validate_init_data("", "").reason == "invalid_input"
