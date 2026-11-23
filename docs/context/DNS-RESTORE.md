# Восстановление DNS-зоны usnee.space

Замер 23.11.2026, авторитативные серверы `launch1.spaceship.net` / `launch2.spaceship.net`.

## Что сейчас в зоне

| Имя | Тип | Значение | Источник |
|---|---|---|---|
| `@` | A | `18.236.27.87` | парковка Spaceship |
| `@` | A | `44.232.4.155` | парковка Spaceship |
| `@` | MX 0 | `mx1.spacemail.com` | интеграция Spacemail (уцелела) |
| `@` | MX 0 | `mx2.spacemail.com` | интеграция Spacemail (уцелела) |

Отсутствует всё остальное: `www` — NXDOMAIN, `@` TXT — нет (SPF пропал), `spacemail._domainkey` — NXDOMAIN (DKIM пропал), `_dmarc` — NXDOMAIN, `_github-pages-challenge-adamfolz` — нет. SOA/NS — `launch1/launch2.spaceship.net`.

Что это значит: парковка вернула свои записи и вытеснила прежние; MX выжили только потому, что ими управляет интеграция Spacemail. HTTP apex отдаёт парковочную страницу (openresty, 9255 байт), HTTPS apex — таймаут.

**Экспорта зоны нет.** Ни в workspace, ни в `M:\REPO GET HUY.B`. Значения SPF и DKIM нигде не записаны — брать только из панели Spacemail или перевыпускать DKIM. Не восстанавливать по памяти.

## Порядок восстановления

### 1. Выключить парковку

В панели Spaceship у домена — раздел с продуктами/Website. Пока парковка активна, она будет возвращать свои A-записи поверх (зона уже улетала дважды).

### 2. Забрать почтовые значения из Spacemail

Панель Spacemail → домен usnee.space → DNS-записи. Скопировать целиком:

- SPF: строка вида `v=spf1 ...` (не выдумывать, взять точную).
- DKIM: селектор `spacemail._domainkey`, публичный ключ `v=DKIM1; k=rsa; p=...`.
- Если DKIM в панели нет — ключ тоже удалён: перевыпустить в Spacemail, это отдельный шаг, старый публичный ключ не восстановить.

### 3. Внести записи

| # | Тип | Host | Значение | TTL |
|---|---|---|---|---|
| 1 | A | `@` | `185.199.108.153` | auto/3600 |
| 2 | A | `@` | `185.199.109.153` | auto/3600 |
| 3 | A | `@` | `185.199.110.153` | auto/3600 |
| 4 | A | `@` | `185.199.111.153` | auto/3600 |
| 5 | CNAME | `www` | `adamfolz.github.io` | auto/3600 |
| 6 | TXT | `@` | SPF из Spacemail | auto/3600 |
| 7 | TXT | `spacemail._domainkey` | DKIM из Spacemail | auto/3600 |
| 8 | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:seksov@proton.me` | auto/3600 |
| 9 | TXT | `_github-pages-challenge-adamfolz` | только если GitHub покажет значение в Settings → Pages; если не покажет — пропустить | auto/3600 |

Запись 9 необязательна: `gh api repos/AdamFolz/USNEE.SPACE/pages` значения challenge не отдаёт (такого поля в ответе нет), а домен верифицирован ранее — указывать её нужно только когда GitHub сам подсветит требуемое значение. Сейчас её в зоне нет, и Pages работает без неё.

Удалить обе парковочные A: `18.236.27.87`, `44.232.4.155`. MX `mx1/mx2.spacemail.com` не трогать.

Опционально (не обязательны для работы сайта, нужны для строгой проверки почты): `_dmarc` после стабилизации можно ужесточить до `p=quarantine`; CAA-записи нет — Pages выпускает через Let's Encrypt, при желании `CAA @ 0 issue "letsencrypt.org"`.

### 4. Проверить от авторитативного сервера, не из кеша

```powershell
Resolve-DnsName usnee.space -Type A   -Server launch1.spaceship.net -DnsOnly
Resolve-DnsName usnee.space -Type MX  -Server launch1.spaceship.net -DnsOnly
Resolve-DnsName usnee.space -Type TXT -Server launch1.spaceship.net -DnsOnly
Resolve-DnsName www.usnee.space       -Server launch1.spaceship.net -DnsOnly
Resolve-DnsName spacemail._domainkey.usnee.space -Type TXT -Server launch1.spaceship.net -DnsOnly
Resolve-DnsName _dmarc.usnee.space    -Type TXT -Server launch1.spaceship.net -DnsOnly
```

Ожидаемо: 4 × 185.199.108–111.153 на apex, `www` → `adamfolz.github.io`, TXT содержит SPF и DKIM, `_dmarc` содержит `v=DMARC1`, парковочных A нет.

### 5. Проверить отдачу сайта

```powershell
curl.exe -sS -o NUL -D - --max-time 20 https://usnee.space/
curl.exe -sS -o NUL -D - --max-time 20 https://usnee.space/landing/
curl.exe -sS -o NUL -D - --max-time 20 https://www.usnee.space/
```

Ожидаемо: 200 и `Server: GitHub.com`. Если HTTPS всё ещё отдаёт не тот сертификат — до 30 минут на выпуск/обновление Pages, затем Settings → Pages → Save (перевыпуск).

### 6. Сторона GitHub — уже в порядке, менять ничего не нужно

`gh api repos/AdamFolz/USNEE.SPACE/pages` на 23.11.2026: `cname=usnee.space`, `https_enforced=true`, `build_type=workflow`, `https_certificate.state=approved`, `domains=["usnee.space"]`, `expires_at=2027-02-06`, `pending_domain_unverified_at=null`.

Вписывать custom domain заново нужно только если Pages успеет снять верификацию (поле `pending_domain_unverified_at` перестанет быть пустым). Тогда: Settings → Pages → Custom domain `usnee.space` → Save → Enforce HTTPS.

**www отдельно**: сертификат Pages выписан только на apex, поэтому `https://www.usnee.space` даёт `ERR_CERT_COMMON_NAME_INVALID`. После возврата DNS — перевыпуск с www (Settings → Pages → Save), иначе www останется сломанным.

## После восстановления — сохранить экспорт

Панель Spaceship → выгрузка зоны (если есть), иначе скриншот всех записей. Положить копию в `M:\ARCHIVE\usnee-2026-11-21\` и в этот каталог. Зона улетала дважды за сутки — без снимка каждый раз восстанавливать заново.

## Наблюдение

Быстрая проверка одной строкой (запускать после любых правок DNS в панели):

```powershell
Resolve-DnsName usnee.space -Type A -Server launch1.spaceship.net -DnsOnly | Select-Object IPAddress
```

Если снова видны `18.236.27.87` / `44.232.4.155` — парковка опять перезаписала зону.
