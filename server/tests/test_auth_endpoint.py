import hashlib
import hmac
import json
import threading
import time
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import pytest

from server.app import make_server

TOKEN = "123456:TEST-token_ABCDEF"
NOW = int(time.time())


def sign(pairs: list[tuple[str, str]], token: str = TOKEN) -> str:
    dcs = "\n".join(f"{key}={value}" for key, value in sorted(pairs, key=lambda item: item[0]))
    secret = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    return hmac.new(secret, dcs.encode(), hashlib.sha256).hexdigest()


def build(**overrides: str) -> str:
    values = {"auth_date": str(NOW), "user": json.dumps({"id": 4242})}
    values.update(overrides)
    pairs = list(values.items())
    return urlencode([*pairs, ("hash", sign(pairs))])


@pytest.fixture()
def base_url():
    httpd = make_server(port=0, bot_token=TOKEN)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    host, port = httpd.server_address[:2]
    yield f"http://{host}:{port}"
    httpd.shutdown()
    httpd.server_close()


def post(url: str, init_data: str | None = None, body: dict | None = None) -> tuple[int, dict]:
    headers = {"Content-Type": "application/json"}
    data = None
    if init_data is not None:
        headers["X-Telegram-Init-Data"] = init_data
    if body is not None:
        data = json.dumps(body).encode()
    request = Request(url, data=data, headers=headers, method="POST")
    try:
        with urlopen(request) as response:
            return response.status, json.loads(response.read())
    except HTTPError as error:
        return error.code, json.loads(error.read())


def test_valid_from_header(base_url: str) -> None:
    status, payload = post(base_url + "/auth/validate", init_data=build())
    assert status == 200
    assert payload == {"ok": True, "userId": 4242}


def test_valid_from_json_body(base_url: str) -> None:
    status, payload = post(base_url + "/auth/validate", body={"init_data": build()})
    assert status == 200
    assert payload["userId"] == 4242


def test_missing_init_data(base_url: str) -> None:
    status, payload = post(base_url + "/auth/validate")
    assert status == 400
    assert payload["reason"] == "missing_init_data"


def test_tampered_field(base_url: str) -> None:
    status, payload = post(base_url + "/auth/validate", init_data=build().replace("4242", "9999"))
    assert status == 401
    assert payload["reason"] == "bad_signature"


def test_expired(base_url: str) -> None:
    status, payload = post(base_url + "/auth/validate", init_data=build(auth_date=str(NOW - 100_000)))
    assert status == 401
    assert payload["reason"] == "expired"


def test_wrong_path(base_url: str) -> None:
    status, payload = post(base_url + "/nope")
    assert status == 404


def test_health(base_url: str) -> None:
    with urlopen(base_url + "/health") as response:
        assert response.status == 200
        assert json.loads(response.read()) == {"ok": True}
