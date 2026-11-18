# API-контракт синхронизации (сервер ещё не развёрнут)

> Источник: реализованный клиент — `src/services/outboxSync.ts`, типы — `src/contracts/sync.ts`. Пока `VITE_API_BASE_URL` пуст, транспорт выключен и outbox остаётся локальным: «Синхронизировано» не показывается.

## Общие правила

- База: `VITE_API_BASE_URL` (без слэша на конце), префикс `/api`.
- Аутентификация: `X-Telegram-Init-Data` — сырая строка `initData` из Mini App. Сервер проверяет HMAC по `TELEGRAM_BOT_TOKEN` и срок, достаёт `user.id`, привязывает записи к нему.
- Идемпотентность: `Idempotency-Key` = `operationId`. Повтор с тем же ключом не создаёт дубль, а возвращает тот же ответ со `status: "duplicate"`.
- Обмен только JSON, UTF-8.
- Ответ обязан быть `SyncAcknowledgement` и содержать `operationId` + `entityId`, иначе клиент считает ответ невалидным (`INVALID_SERVER_RESPONSE`).

## POST /api/sync/operations

Тело — `OutboxOperation<TPayload>`:

```json
{
  "operationId": "8f3e…",
  "entityId": "2b1c…",
  "entityType": "entry",
  "kind": "create",
  "baseRevision": 0,
  "payload": { "entryId": "2b1c…", "substanceId": "meph", "methodId": "inject", "amount": { "value": 1, "unit": "ml", "calculatedMassMg": 20 }, "occurredAt": "2026-11-08T09:12:00.000Z", "alone": true },
  "createdAt": "2026-11-08T09:12:03.120Z",
  "attempts": 0
}
```

Ответы:

| HTTP | `status` | Что делает клиент |
|---|---|---|
| 200 | `accepted` | помечает `synced`, сохраняет `lastSyncedAt` |
| 200 | `duplicate` | тоже `synced` — операция уже была |
| 200 | `conflict` | `conflicted`, outbox на паузе, нужен разбор |
| 200 | `rejected` | `failed` с `errorCode`, повторов нет |
| 5xx / сеть | — | остаётся `pending`, ретрай с backoff (2 с → 5 мин) |

```json
{ "operationId": "8f3e…", "entityId": "2b1c…", "status": "accepted", "revision": 1, "serverTime": "2026-11-08T09:12:04.000Z" }
```

## Семантика операций

- `create` — вставка; на сервере — upsert по `entityId` + `operationId`.
- `update` — правка времени/заметки; конфликт, если `baseRevision` меньше серверной.
- `delete` / `reverse` — компенсирующая отмена, хранится как отдельная операция; пользовательские данные не стираются физически.
- Порядок гарантируется `operationId` + `createdAt`; сервер вправе отвергнуть операцию с неизвестной `entityType`.

## Чего сервер обязан не делать

- Не отдавать `accepted` без записи в свою БД.
- Не менять `operationId`/`entityId` в ответе.
- Не требовать `initData`, если он не проверен — иначе клиент отправит данные «в никуда».

## Минимум для первого запуска

1. Проверка `initData` (HMAC-SHA256 по схеме Telegram WebApp).
2. Таблица операций с уникальным ключом `operationId` (идемпотентность).
3. Хранение записей с `user_id` и `revision`.
4. Не более 50 операций в секунду на пользователя; ответ ≤ 1 с в p95.

## Локальная проверка

`server/mock-sync.mjs` — мок без зависимостей и без персистентности, только для разработки:

```bash
npm run dev:api            # слушает 127.0.0.1:8788
# в .env:
# VITE_API_BASE_URL=http://127.0.0.1:8788
# VITE_ALLOW_DEV_INITDATA=1
```

Ветки ответа форсируются параметром: `POST /api/sync/operations?force=conflict` или `?force=rejected`. Без `VITE_ALLOW_DEV_INITDATA` транспорт остаётся выключенным, потому что в обычном браузере `initData` пустой.

Мок не заменяет сервер: данные в памяти и теряются при перезапуске.

Полный блупринт стека — [INFRASTRUCTURE.md](INFRASTRUCTURE.md).
