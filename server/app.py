"""Локальный HTTP-эндпоинт валидации initData.

POST /auth/validate — init_data берётся из заголовка X-Telegram-Init-Data
или из JSON-тела {"init_data": "..."}. Секрет (bot_token) подставляет слой
сервера; сам модуль валидации окружение не читает.

Запуск: TELEGRAM_BOT_TOKEN=... python -m server.app --port 8787
"""

from __future__ import annotations

import argparse
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from server.validate_init_data import validate_init_data

MAX_BODY = 64 * 1024


class Handler(BaseHTTPRequestHandler):
    server_version = "USNEE-InitData/0.1"

    def _send(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_init_data(self) -> str | None:
        header = self.headers.get("X-Telegram-Init-Data")
        if header:
            return header
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return None
        if length > MAX_BODY:
            return None
        raw = self.rfile.read(length)
        try:
            parsed = json.loads(raw)
        except (ValueError, UnicodeDecodeError):
            return None
        if isinstance(parsed, dict) and isinstance(parsed.get("init_data"), str):
            return parsed["init_data"]
        return None

    def do_POST(self) -> None:  # noqa: N802 (stdlib naming)
        if self.path.rstrip("/") != "/auth/validate":
            self._send(404, {"ok": False, "reason": "not_found"})
            return
        init_data = self._read_init_data()
        if init_data is None:
            self._send(400, {"ok": False, "reason": "missing_init_data"})
            return
        result = validate_init_data(init_data, self.server.bot_token)  # type: ignore[attr-defined]
        if result.ok:
            self._send(200, {"ok": True, "userId": result.user_id})
        else:
            self._send(401, {"ok": False, "reason": result.reason})

    def do_GET(self) -> None:  # noqa: N802
        if self.path.rstrip("/") == "/health":
            self._send(200, {"ok": True})
            return
        self._send(404, {"ok": False, "reason": "not_found"})

    def log_message(self, fmt: str, *args) -> None:
        pass


def make_server(host: str = "127.0.0.1", port: int = 8787, bot_token: str | None = None) -> ThreadingHTTPServer:
    token = bot_token if bot_token is not None else os.environ.get("TELEGRAM_BOT_TOKEN", "")
    httpd = ThreadingHTTPServer((host, port), Handler)
    httpd.bot_token = token  # type: ignore[attr-defined]
    return httpd


def main() -> None:
    parser = argparse.ArgumentParser(description="USNEE initData validation endpoint")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8787)
    args = parser.parse_args()
    httpd = make_server(args.host, args.port)
    if not httpd.bot_token:  # type: ignore[attr-defined]
        print("warning: TELEGRAM_BOT_TOKEN пуст — все запросы получат invalid_input")
    print(f"listening on http://{args.host}:{args.port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
