# Бэкенд: initData-валидация и выбор платформы (п.10, п.11)

Проектное решение, без реализации. Опора: `API-CONTRACT.md`, ADR 0001, Telegram Bot Developer Terms §4.4(e) («security checks для WebAppData» — платформенное требование), образец SEKSOV `web.py`.

## 1. Валидация Telegram initData (HMAC-SHA256) — спека

### Алгоритм (по документации Telegram Mini Apps)

Вход: сырая строка `initData` из заголовка `X-Telegram-Init-Data` (API-CONTRACT.md).

1. Распарсить query-string с сохранением пустых значений (`parse_qsl keep_blank_values=True`).
2. Извлечь и удалить поле `hash`. Если `hash` отсутствует → 401.
3. Собрать `data_check_string`: все оставшиеся пары `key=value`, отсортированные по ключу (byte-order), соединённые `\n`.
4. Вычислить секрет: `secret_key = HMAC_SHA256(key="WebAppData", msg=bot_token)` — **ключ именно строка "WebAppData", сообщение — токен бота** (порядок важен; образец SEKSOV web.py:22–36 делает верно).
5. Вычислить `calculated = HMAC_SHA256(key=secret_key, msg=data_check_string).hexdigest()`.
6. Сравнить `calculated` и полученный `hash` **constant-time** (`hmac.compare_digest`). Неравенство → 401.
7. Проверить срок: `auth_date` (unix seconds) — `now - auth_date <= TTL`. **TTL обязателен** (API-CONTRACT.md требует «HMAC и срок»; образец SEKSOV TTL НЕ проверяет — дыра образца, в спеке закрыта). Рекомендация: TTL 24 ч для сессии Mini App; повторная валидация при каждом запросе синхронизации. Просрочен → 401 с кодом `INITDATA_EXPIRED`, клиент перезапускает Mini App для свежего initData.
8. Извлечь `user` (JSON) → `user.id` как идентификатор владельца данных. Отсутствует/не парсится → 401.

### Требования к реализации

- Токен бота — только из окружения (`TELEGRAM_BOT_TOKEN`), никогда в коде/репо/логах (Developer Terms §4.5).
- Ошибки валидации не раскрывают причину наружу beyond кода (не логировать initData/hash).
- Dev-режим (`VITE_ALLOW_DEV_INITDATA=1`, mock-sync) — отдельный флаг сервера, в production выключен; образец SEKSOV `resolve_telegram_user_id` допускает dev_user_id только при web_dev_mode — перенять.
- Rate limit: ≤50 ops/сек/пользователь (API-CONTRACT.md минимум первого запуска).
- Идемпотентность: таблица операций с unique `operationId`; повтор → `status:"duplicate"` (уже в контракте).
- Ответ обязан быть `SyncAcknowledgement` с operationId+entityId, иначе клиент считает `INVALID_SERVER_RESPONSE`.

### Псевдокод (Python, стиль образца SEKSOV + TTL)

```python
def validate_init_data(init_data: str, bot_token: str, ttl_seconds: int = 86400) -> dict:
    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = pairs.pop("hash", None)
    if not received_hash:
        raise AuthError("missing hash")
    dcs = "\n".join(f"{k}={pairs[k]}" for k in sorted(pairs))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calculated = hmac.new(secret, dcs.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calculated, received_hash):
        raise AuthError("bad signature")
    auth_date = int(pairs.get("auth_date", "0"))
    if time.time() - auth_date > ttl_seconds:
        raise AuthError("expired")
    return json.loads(pairs["user"])
```

### Тест-векторы (обязательны перед деплоем)

- Валидный initData → user.id извлечён.
- Подменённое любое поле → 401.
- Отсутствующий hash → 401.
- auth_date старше TTL → 401 INITDATA_EXPIRED.
- Пустые значения полей сохраняются в dcs (keep_blank_values).
- Порядок полей в исходной строке не влияет на результат (сортировка).

## 2. Выбор платформы: Cloudflare Workers + D1 vs VPS

### Факты (проверено web-исследованием, источники ниже)

- **РФ-троттлинг Cloudflare**: официальный блог Cloudflare 26.06.2025 — с 09.06.2025 российские ISP (Ростелеком, Мегафон, Вымпелком, МТС, МГТС) обрезают передачу после первых **16 КБ** любого ассета, injected packets/reset/timeout, все протоколы HTTP/1.1, HTTP/2, HTTP/3 QUIC. Cloudflare не может это починить. Также затронуты Hetzner, DigitalOcean, OVH. Источник: https://blog.cloudflare.com/russian-internet-users-are-unable-to-access-the-open-internet
- РКН 07.11.2024 рекомендовал отказаться от Cloudflare CDN (pravo.ru).
- **bit.hosting BitCore [NL]**: 2 vCore / 4 ГБ RAM ECC / 40 ГБ NVMe / ~150 Mbit/s / 1 IPv4 / KVM / unlimited traffic / Amsterdam / **$9.00/мес**, оплата BTC/ETH/USDT, скидки 5/10/15% за 3/6/12 мес. Источник: https://bit.hosting/en/vps-crypto. Баланс аккаунта $0 (из брифа; проверка только в биллинге владельца).
- Текущий VPS 201.3.225.93 мёртв для HTTP (TCP открыт, сервис молчит) — см. INFRASTRUCTURE.md.
- Аудитория USNEE — РФ-пользователи Telegram Mini App (основной рынок на старте).

### Сравнение

| Критерий | Workers + D1 | VPS bit.hosting NL |
|---|---|---|
| Доступность из РФ | **Сломана**: троттлинг 16 КБ на всех протоколах, не чинится | Не проверена; NL-хостинг вне списка затронутых (Hetzner/DO/OVH названы, bit.hosting нет) — **требует замера перед покупкой** |
| Стек | JS/TS, D1 (SQLite), лимиты free tier | Полный контроль: FastAPI+PG16+Redis по блупринту, или Node |
| Цена | Free tier caps (D1 5M rows read/day и т.п.), paid $5/мес | $9/мес фикс, крипто-оплата без банков |
| Эксплуатация | Serverless, ноль админства | UFW/fail2ban/бэкапы/обновления на владельце |
| Юрисдикция | US-компания, GDPR-совместимо | NL (EU), GDPR; вне РФ |
| initData HMAC | Реализуемо (WebCrypto) | Реализуемо (любой стек) |
| Риск блокировки | Высокий (РКН-рекомендация + троттлинг) | Средний (IP может попасть под раздачу; домен usnee.space на Pages уже работает из РФ) |

### Решение (рекомендация)

**VPS bit.hosting BitCore [NL] $9/мес** — основной кандидат. Обоснование:

1. Workers+D1 фактически недоступен для РФ-аудитории (троттлинг 16 КБ ломает любой API-ответ больше 16 КБ и сами ассеты Mini App при проксировании через CF). Это не риск, а подтверждённое текущее состояние.
2. VPS даёт полный стек блупринта (FastAPI/PG/Redis) и контроль над шифрованием at rest (Developer Terms §4.4: ключ отдельно от данных).
3. Крипто-оплата решает проблему платежей из РФ.
4. $9/мес покрывает минимум первого запуска (API-CONTRACT.md: p95 ≤1с, ≤50 ops/сек — BitCore 2vCPU/4GB достаточно с запасом).

**Обязательное условие перед покупкой**: замер доступности NL-IP bit.hosting из РФ (curl с российского канала/VPN-выход в РФ, проверка >16 КБ ответа). Если NL тоже троттлится — рассмотреть РФ-хостинг для API (152-ФЗ вопрос из INFRASTRUCTURE.md) при сохранении фронта на Pages.

**Workers+D1 оставить как запасной вариант** для нерф-аудитории (B2B EU/US клиенты из п.17) — там троттлинга нет, serverless дешевле в эксплуатации.

### Что НЕ делать

- Не размещать API на текущем VPS 201.3.225.93 (мёртв).
- Не использовать seksov.love/api.seksov.love (NXDOMAIN). Новый поддомен: `api.usnee.space` (DNS у владельца домена).
- Не хранить токены/ключи в репо (см. инструкцию токена, п.13).

## 3. Минимум первого запуска (из API-CONTRACT.md, без изменений)

1. initData HMAC + TTL (спека выше).
2. Таблица операций, unique operationId.
3. Записи user_id + revision.
4. ≤50 ops/сек/пользователь, p95 ≤1с.
5. Шифрование чувствительных полей (Fernet/pgcrypto), ключ отдельно от данных (§4.4).
6. Бэкап pg_dump + проверка восстановлением (блупринт).

Реализация — отдельной командой. Этот документ — решение, не код.