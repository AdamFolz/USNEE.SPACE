# DNS usnee.space — состояние и восстановление

Обновлено 23.11.2026 20:30 MSK. Предыдущая версия описывала снос зоны парковкой; ниже — факт после ручного восстановления.

## Что уже восстановлено (проверено DoH Google + авторитативные NS)

| Запись | Значение | Статус |
|---|---|---|
| A `@` | 185.199.108.153, .109.153, .110.153, .111.153 | ✅ в зоне |
| CNAME `www` | adamfolz.github.io | ✅ в зоне |
| MX `@` | 0 mx1.spacemail.com, 0 mx2.spacemail.com | ✅ в зоне (добавлено 23.11, TTL 30 min) |
| TXT `_dmarc` | v=DMARC1; p=none; rua=mailto:seksov@proton.me | ✅ в зоне |
| TXT `@` (SPF) | v=spf1 include:spf.spacemail.com ~all | ✅ в зоне (значение из официального блога Spaceship, не выдумано) |
| TXT `spacemail._domainkey` (DKIM) | — | ❌ NXDOMAIN |

Проверка, которая не врёт локальным кешем (Windows держит негативный ответ по SOA до часа):

```powershell
curl.exe -sS 'https://dns.google/resolve?name=usnee.space&type=MX'
curl.exe -sS 'https://dns.google/resolve?name=usnee.space&type=TXT'
curl.exe -sS 'https://dns.google/resolve?name=_dmarc.usnee.space&type=TXT'
curl.exe -sS 'https://dns.google/resolve?name=spacemail._domainkey.usnee.space&type=TXT'
```

`Resolve-DnsName` и `nslookup` после правок в панели показывают старое (кеш клиента/инстанса) — не использовать как единственный источник.

## Осталось сделать

1. **DKIM — единственное, что осталось по почте** — только из панели Spacemail (нужен вход в почтовый ящик; агент пароль не вводит).
   - Открыть Spacemail → домен usnee.space → раздел аутентификации/DKIM.
   - Если ключ есть: скопировать селектор `spacemail._domainkey` и строку `v=DKIM1; k=rsa; p=...` → добавить TXT.
   - Если ключа нет: сгенерировать новый там же и только потом копировать в DNS (старый публичный ключ после удаления не восстановить).
   - Без DKIM исходящая почта не подписана; SPF и DMARC уже на месте.
2. **Сертификат www** — см. раздел ниже.

## Сертификат и канонический хост

На 23.11 20:23 `gh api repos/AdamFolz/USNEE.SPACE/pages`:

```
cname=www.usnee.space   https_enforced=False
cert: {"state":"dns_changed","domains":["www.usnee.space","usnee.space"],"expires_at":"2027-02-06"}
```

GitHub принял смену custom domain и запросил сертификат на оба имени. Пока не `approved`:

- `http://www.usnee.space` → 200 (сайт доступен по HTTP);
- `https://usnee.space` → 301 на `https://www.usnee.space`, где TLS невалиден (отдаётся `*.github.io`);
- `https_enforced` сброшен в `false` переходом PUT и должен быть возвращён в `true` после `approved`.

Порядок:

```powershell
# ждать approved (не дольше 30 минут за один заход, GitHub может выпускать до нескольких часов)
gh api repos/AdamFolz/USNEE.SPACE/pages --jq '.https_certificate.state'
# после approved:
gh api -X PUT repos/AdamFolz/USNEE.SPACE/pages -f https_enforced=true
gh api repos/AdamFolz/USNEE.SPACE/pages --jq '.https_certificate.domains'
```

Если сертификат не выпускается часами — снять custom domain и привязать заново (`cname=usnee.space`), это запускает свежий выпуск; при этом сайт на несколько минут отдаётся с `adamfolz.github.io/USNEE.SPACE/`.

## Продукт Alf Website (риск повторного сноса)

В зоне остаётся продуктовая запись `sex → websitebuilder.spaceship.com` (группа Alf Website, TTL 20 min). Она **управляется продуктом**: чекбокса нет, из DNS не удаляется.

- Сайт: Alf Website Standard (TRIAL) для `sex.usnee.space`, Product ID `92a01206-3c8a-449a-9575-796266ece428`, старт 08.11.2026, продление **08.12.2026, $5.00/мес, auto-renew включён**.
- Отключение от домена — в Alf Website Studio (`/application/alf-website-studio/`) в меню «⋮» панели продукта. Программно меню не открывается; нужно ручное действие владельца.
- До отключения продукт остаётся единственным источником, способным перезаписать зону.

## Экспорт зоны

Снимок до правок: `M:\ARCHIVE\usnee-2026-11-21\dns-zone-2026-11-23.txt` (6 записей как было + DNS-запросы). После любых изменений в панели сохранять новый снимок туда же — зона терялась дважды за сутки.

## Итоговая приёмка (после SPF/DKIM и сертификата)

```powershell
curl.exe -sS -o NUL -w "apex=%{http_code} "    https://usnee.space/ --max-time 20
curl.exe -sS -o NUL -w "www=%{http_code} "     https://www.usnee.space/ --max-time 20
curl.exe -sS -o NUL -w "landing=%{http_code}`n" https://www.usnee.space/landing/ --max-time 20
```

Ожидается: 301 на apex, 200 на www и `/landing/`, SAN сертификата содержит `usnee.space` и `www.usnee.space`.
