# LICENSE — предложение (п.4, без коммита)

Факт: файла LICENSE нет, в `git ls-files` нет, поля `license` в package.json нет. `"private": true`, name "usnee". Репо публичный (AdamFolz/USNEE.SPACE).

## Варианты

| Вариант | Суть | Плюсы для USNEE | Минусы |
|---|---|---|---|
| **All Rights Reserved** (закрытая) | Файл LICENSE с явным «© 2026 AdamFolz. All rights reserved.» + запрет использования/копирования без разрешения | Приватный дневник ПАВ — чувствительная тематика; B2B white-label и гранты требуют контроля над кодом; никто не форкнет и не запустит клон с вашим брендом | Публичный репо без открытой лицензии юридически «все права защищены» по умолчанию — файл лишь фиксирует это явно; контрибьюторы со стороны невозможны |
| MIT | Разрешает всё, включая коммерческие клоны | Максимальная открытость, привычно для GitHub | Любой может запустить клон дневника ПАВ под своим брендом; размывает B2B-ценность; для грантов/B2B контроль теряется |
| AGPL-3.0 | Открыто, но сетевые клоны обязаны открыть исходники | Защита от закрытых SaaS-клонов | Форки всё равно возможны; для white-label B2B AGPL заражает клиентские интеграции — отпугнёт сервисы-покупатели |

## Рекомендация

**All Rights Reserved.** Обоснование: продукт — приватный дневник употребления ПАВ с прицелом на B2B white-label (модель neo360/Brave/Substance Misuse Resources) и гранты. Открытая лицензия обесценивает единственный актив — код и бренд. Публичность репо нужна для Pages и прозрачности, не для форков.

Текст файла (если одобрено):

```
Copyright (c) 2026 AdamFolz. All rights reserved.

This source code is published for transparency and deployment via GitHub Pages.
No permission is granted to use, copy, modify, merge, publish, distribute,
sublicense, or sell copies of this software without explicit written permission
from the copyright holder.
```

Плюс поле `"license": "UNLICENSED"` в package.json (npm-конвенция для закрытого кода).

Решение за владельцем. Коммит только по отдельной команде.