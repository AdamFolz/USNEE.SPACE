# Браузерные инструменты OpenCode — расследование и выключатель (п.6)

## Кто создаёт browser-refs.py

**Сам агент OpenCode, не плагин.** Скрипт `%TEMP%\opencode\browser-refs.py` (617 Б, изменён 21.11.2026 13:08) — ad-hoc bash heredoc: грепает `browser` по dist-файлам oh-my-opencode-slim@3.0.7 и печатает контекст. Доказательство падения: `C:\Users\Jonson\.local\share\opencode\shell\dbd1f6d2e590b86b5190341f400a7f77f45c9bf3\sh_1fd94ae2f001QEdY4XyF7Day53.out`:

```
File "C:\Users\Jonson\AppData\Local\Temp\opencode\browser-refs.py", line 10, in <module>
File "C:\Python314\Lib\encodings\cp1251.py", line 19, in encode
UnicodeEncodeError: 'charmap' codec can't encode character '\u2394' in position 260
```

Причина: stdout Python в Windows-консоли = cp1251, символ `⎔` (U+2394) из минифицированного JS не кодируется. В `%TEMP%\opencode` ~60 таких ad-hoc скриптов агента. OMOS браузерных тулзов не добавляет (его log: tools count 10, bundled skills 11; `maybeOpenBrowser` в dist — внутренняя функция interview-сервера, не MCP-тулза).

## Что такое «45 тулзов»

**MCP venice** (`@veniceai/mcp-server`). Проверено по `dist\tools\index.js`: 45 уникальных имён `venice_*` (42 зарегистрированных name + venice_parameters/venice_system_prompt/venice_x402_* — итого 45 строк в реестре). Фильтра тулзов в config.js пакета нет — отключаются только на стороне клиента.

## Скиллы браузера

Watcher OpenCode подписан на `C:\Users\Jonson\.claude\skills`, `C:\Users\Jonson\.agents\skills`, `C:\Users\Jonson\.config\opencode\skills` (log opencode.log, watcher subscribe). Найдены:

- `.agents\skills\agent-browser` — `hidden: true`, CLI не установлен (мёртвый скилл, но описание триггерится на «open a website» и т.п.)
- `.agents\skills\autoglm-browser-agent`
- `.agents\skills\browser-qa` (+ дубль в `.claude\skills`)

Скилла «Browser Use» нет. Глобальные `.config\opencode\skills` — только 19 venice-*. Проектных `.agents`/`.opencode` в USNEE.SPACE нет.

## Выключатели (предложение, НЕ применено)

### 1. Кодировка (лечит падение, ничего не отключая)

Переменная окружения User: `PYTHONIOENCODING=utf-8`. Или запуск `python -X utf8`. Действие владельца (системная настройка).

### 2. Per-tool отключение venice (опционально, если 45 тулзов жрут контекст)

В `opencode.jsonc` верхнеуровневый блок `"tools"` (сейчас отсутствует):

```jsonc
"tools": {
  "venice_image_generate": false,
  "venice_image_edit": false,
  "venice_image_multi_edit": false,
  "venice_image_remove_bg": false,
  "venice_image_upscale": false,
  "venice_video_generate": false,
  "venice_video_complete": false,
  "venice_video_status": false,
  "venice_video_quote": false,
  "venice_music_generate": false,
  "venice_music_complete": false,
  "venice_music_status": false,
  "venice_audio_quote": false,
  "venice_tts": false,
  "venice_asr": false,
  "venice_voice_clone": false,
  "venice_crypto_networks": false,
  "venice_crypto_rpc": false,
  "venice_x402_balance": false,
  "venice_x402_top_up_info": false,
  "venice_x402_transactions": false,
  "venice_character_reviews": false,
  "venice_chat_with_character": false,
  "venice_get_character": false,
  "venice_list_characters": false,
  "venice_tee_attestation": false,
  "venice_tee_signature": false
}
```

Оставить: `venice_web_search`, `venice_web_scrape`, `venice_chat`, `venice_responses`, `venice_list_models`, `venice_model_details`, `venice_model_traits`, `venice_embeddings`, `venice_text_parser`, billing/api-key утилиты. Полное отключение venice (`"enabled": false` в mcp.servers) нежелательно — нужен web_search.

### 3. Скиллы браузера через OMOS

Конфиг `oh-my-opencode-slim.json(c)` **на диске отсутствует** (дефолты). Создать `C:\Users\Jonson\.config\opencode\oh-my-opencode-slim.json`:

```json
{
  "disabled_skills": ["agent-browser", "autoglm-browser-agent", "browser-qa"]
}
```

Схема подтверждена в dist: `disabled_mcps/disabled_tools/disabled_skills/disabled_agents/disabled_hooks/disabled_commands`. Альтернатива без OMOS — удалить/переименовать папки скиллов (действие владельца, ничего не удалять без команды).

### 4. Глобальный AGENTS.md OpenCode

Устарел: ссылается на удалённые MCP chrome-devtools/browse и CDP 9333. Не правил (вне scope). Кандидат на чистку отдельной командой.

## Статус

Расследование завершено, все факты проверены чтением файлов/логов. Выключатели — предложение, применение за владельцем.