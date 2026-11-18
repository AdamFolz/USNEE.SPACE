# USNEE — дневник употребления. Без лекций.

Telegram Mini App: приватный журнал употребления, который работает **без сервера**.
Записи живут в IndexedDB на устройстве, история и статистика считаются локально.
Серверная синхронизация — опциональна и добавляется, когда доступен бэкенд.

> **Без осуждения, только факты.** Приложение не вызывает скорую и не заменяет помощь:
> в экстренной ситуации звони 112 сам. Подробнее на экране SOS.

## Открыть

- Telegram: [@usnee_bot](https://t.me/usnee_bot) → кнопка меню «Открыть»
- Веб: [https://usnee.space](https://usnee.space)

## Возможности

- Запись в один тап: вещество, способ, доза, триггер + пульс, место, партия
- Живой интервал с прошлой записи и защита от дублей в течение часа
- История: хитмап 12 недель, стрики, сводки 7/30 дней
- Геймификация: XP, уровни, ачивки, конфетти и haptic
- SOS: локальный чек-лист, NORS-таймер, доверенный контакт (без внешних обещаний)
- PIN-лок и шифрованный экспорт (PBKDF2 + AES-GCM), полный офлайн

## Стек

React 18 · TypeScript · Vite · PWA (Workbox) · IndexedDB (`idb 8`) · Zustand · TailwindCSS · Vitest + Testing Library

## Разработка

```bash
npm ci
npm run dev        # http://127.0.0.1:5173
npm run test:run   # 327 тестов
npm run typecheck
npm run build      # PWA в dist/
```

Деплой в GitHub Pages — по push в `main` (`.github/workflows/deploy.yml`):
typecheck → tests → build → artifact → Pages, домен `usnee.space`.

## Документация

- [`docs/context/PRODUCT.md`](docs/context/PRODUCT.md) — продукт, тон, границы
- [`docs/context/DESIGN.md`](docs/context/DESIGN.md) — направление B «Дневник»: токены, шрифты
- [`docs/context/API-CONTRACT.md`](docs/context/API-CONTRACT.md) — контракт синхронизации и `initData`
- [`docs/context/INFRASTRUCTURE.md`](docs/context/INFRASTRUCTURE.md) — бэкенд-блупринт
- [`docs/adr/`](docs/adr) — архитектурные решения
- [`docs/screen-state-matrix.md`](docs/screen-state-matrix.md) — матрица состояний экранов

## Приватность

Записи не покидают устройство, пока пользователь сам не включит синхронизацию.
Аналитика: только обезличенные события (`app_open`, `record_created`, `safety_opened`) через PostHog EU.
Подробности в [PRODUCT.md](docs/context/PRODUCT.md).