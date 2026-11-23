# GitHub-инвентарь AdamFolz — решения (п.7, ничего не удалять)

Источник: коннектор oversea_github `search_repositories user:AdamFolz` (total 13, все fork=false, archived=false) + `list_commits` для недостающих дат. Дата инвентаря: 21.11.2026.

**Правило пункта: только разложить (архив / удалить-кандидат / оставить), ничего не выполнять.** Архив = `git bundle` в `M:\ARCHIVE\` по отдельной команде, затем GitHub Archive (read-only) или удаление — решает владелец.

| # | Репо | Приватность | Язык | Последний коммит | Решение | Обоснование |
|---|---|---|---|---|---|---|
| 1 | **USNEE.SPACE** | public | TypeScript | 21.11.2026 | **Оставить** | Основной продукт, Pages прод, активная разработка |
| 2 | HOJ-S-JOURNEY---v0.1 | private | — | 21.10.2026 | **Решение владельца** | «Тёплая история для всех возрастов. Mobile + PC», 1 open issue. Не относится к USNEE; свежий (месяц назад). Оставить если проект живой, иначе архив |
| 3 | privacytune | private | Batchfile | 20.08.2026 | **Архив** | 1 КБ, без описания, один батник. Утилита приватности Windows — историческая ценность мала, bundle дешёвый |
| 4 | predskazbot | private | Python | 29.07.2026 | **Архив** | Telegram prediction bot (Amvera), 206 КБ. Предшественник BOTOVODYVROT-линейки, не USNEE |
| 5 | SEKS-BOT-2.0 | private | — | **пустой (409 Git Repository is empty)** | **Удалить-кандидат** | 0 байт, коммитов нет, 1 star. Терять нечего; удаление только по команде владельца |
| 6 | PREDSKASEKSOV | private | Python | 19.07.2026 | **Архив** | 349 КБ, описание матом, PR#3 cleanup. Исторический бот, не USNEE |
| 7 | BOTOVODYVROT-main | private | Python | 10.07.2026 | **Архив** | Merge PR#1 «Add files via upload» — копия-загрузка основного BOTOVODYVROT. Дубль |
| 8 | usnee | private | Python | 08.07.2026 | **Архив** | ⚠ Последний коммит «security: remove .env and dev.env from repo» — секреты были в истории, остаются в git-объектах. Перед любым публичным действием — проверка истории. Предшественник USNEE v1 (Python), 1 open issue |
| 9 | USNEE-V2 | private | — | **пустой (409 Git Repository is empty)** | **Удалить-кандидат** | Описание «WEB», коммитов нет. Пустышка; код v2 живёт локально (`_old-usnee-v2`) |
| 10 | SEKSOV- | private | Python | 29.06.2026 (tip 7ac0776, PR#13) | **Архив** | «SEKSOV МЯУ». Локальные копии устарели (см. ниже). Единственный источник актуального кода SEKSOV — этот репо; bundle обязателен перед любыми действиями |
| 11 | BOTOVODYVROT | private | Python | 29.06.2026 | **Архив** | Основной репо линейки предсказ-ботов, содержательные коммиты (memory wiring, sqlite_store). Исторический, не USNEE |
| 12 | SWDSAD | private | Python | 24.06.2026 | **Удалить-кандидат** | «ASDASD», один коммит «Update project». Мусорный тестовый репо |
| 13 | AdamFolz | private | — | 16.06.2026 («Initialize repository») | **Оставить** | Profile config repo (README профиля GitHub). Технический, нужен для оформления аккаунта |

Итого: оставить 2 (+1 на решение владельца), архив 7, удалить-кандидат 3. Ничего не выполнено.

## Сверка SEKSOV- (п.8)

**Не одно и то же.** Факты:

- `M:\USNEE.SPACE\SEKSOV-` — **пустая директория**: не symlink, `.git` нет, файлов нет. Это не клон и не копия репо.
- GitHub tip: `7ac077648a2e6ff8bb584f4b7c31e7ff34d049f2` «Merge PR #13 … Tighten development setup documentation», 29.06.2026 15:41. Перед ним PR#12 «Tighten auth, validate WebApp init, fix storage race, sanitize web UI, and add tests».
- Локальная копия `M:\REPO GET HUY.B\NOW THIS WORK_ORGANIZED\SEKSOV Bot\_archive\checkout-2026-06-24`: git-клон origin SEKSOV-, HEAD `5e890f71bf231b49931e2a03b0c27d6619260601` (PR#10). `git cat-file -t 7ac0776…` → fatal: tip локально отсутствует. Размеры README.md 9830 / run.py 584 / .env.example 332 ≠ GitHub.
- Локальная копия `_archive\download-main-2026-06-30`: zip-снимок. README_WEB.md 4471 и run.py 558 совпадают с GitHub; README.md 9697 / .env.example 319 расходятся. ⚠ Внутри **.env с секретами** — не читать, не светить, не копировать в app.
- Копии в `SEKSOV Bot` и `SEKSOV BotMYAY` (без .git) — рабочие снапшоты, не репозитории.

Вывод: пустая папка в корне ≠ репо; локальные архивы устарели/расходятся с tip; точное соответствие ни одной копии GitHub-tip не подтверждено. Актуальный код SEKSOV — только на GitHub.

## Замечания безопасности

- `usnee`: секреты удалены из HEAD, но остались в истории git. Если репо когда-либо станет публичным или будет передан — нужна чистка истории (filter-repo) с предварительным копированием приватного (ловушка filter-branch reset --hard из брифа).
- `SEKSOV-\_archive\download-main-2026-06-30\.env`: живой секрет в архиве. Хранить как есть, не распространять.