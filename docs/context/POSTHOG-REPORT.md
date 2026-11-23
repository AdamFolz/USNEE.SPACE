# PostHog — проверка квоты и состояния (п.14)

## Факты из кода

- Ключ: `phc_uNosHtYorbCNiHyJvmRuUowSf8p2wWr8hdkBb5HJso59` в `src/integrations/analytics.public.ts:5`.
- Host: `https://eu.i.posthog.com` (EU Cloud).
- Ключ **легитимно публичный**: write-only project API key, намеренно в коде, не в .env. Это не секрет.
- В app только `.env.example`, реальных .env нет.

## Конфигурация аналитики (analytics.ts, прочитан полностью)

- autocapture: false
- disable_session_recording: true
- ip: false
- property_denylist: ['$ip','$host','$browser','$os','$device_type','$current_url','$pathname']
- distinct_id: anonymous (без user id/initData)
- EVENT_ALLOWLIST: app_open['source'], screen_view['name'], record_created[], record_repeated[], record_undone[], stats_viewed[], safety_opened[], app_error['class']
- Неизвестные события/props дропаются; fail-safe try/catch.
- HARD RULES в комментарии: никогда не слать substance/method/dose/notes/timestamps/initData/user id/PII.

Вывод по конфигурации: приватность соблюдена на уровне кода — обезличенные продуктовые события, без чувствительных данных. Соответствует privacy-драфту.

## Пробы (выполнены 21.11.2026)

1. **GET eu.i.posthog.com/api/environments/@current/quota_limits/** → «PostHog is not available in your region» — **геоблок РФ на billing-API**. Квоту по этому эндпоинту из РФ проверить нельзя.
2. **POST /flags/?v=2** с token+distinct_id (через temp json-файл) → **200**:
   ```json
   {"errorsWhileComputingFlags":false,"flags":{},"requestId":"53d4e841-b086-4302-b991-963a0cc4bbe3","evaluatedAt":1795264256053}
   ```
   Проект жив, ключ принимает запросы, feature flags нет (пусто — нормально, флаги не используются).

## Квота — честный статус

**Проверить квоту по публичному ключу невозможно.** Причины:

- quota_limits API требует authenticated session (dashboard), не project key; из РФ отдаёт геоблок.
- Публичный phc_ ключ даёт только write (capture) и read flags — не billing/quota.
- Лимиты EU Cloud free tier (справочно, из документации PostHog): 1M events/мес, 5K session recordings/мес (отключены у нас), 1M feature flag requests/мес. Превышение → события дропаются или биллинг.

**Что нужно владельцу**: открыть дашборд PostHog (eu.posthog.com) под своим аккаунтом → Project → Usage/Billing → посмотреть текущий event count vs лимит. Из РФ дашборд может требовать VPN (геоблок касается API; веб-дашборд обычно доступен, но проверять). Агент в дашборд не входит (пароли не вписывать — правило Playwriter).

## Рекомендации

1. Квоту мониторить в дашборде владельца раз в месяц до запуска синхронизации (рост событий при включении record_created на сервере маловероятен — allowlist фиксирован).
2. При приближении к 1M events/мес — либо платный план, либо сэмплирование app_open/screen_view (самые частые события).
3. Геоблок billing-API из РФ — ожидаемое поведение, не ошибка проекта. На capture/flags не влияет (проба 200 подтверждает).
4. Ключ не ротировать без необходимости: он публичный write-only, утечка не даёт доступа к данным (только запись мусорных событий — mitigated allowlist'ом на клиенте, но серверный фильтр PostHog тоже настраивается в дашборде).

## Статус

Проект жив (flags 200). Квота непроверяема без дашборда владельца — честно доложено. Конфигурация приватности соответствует заявленной политике.