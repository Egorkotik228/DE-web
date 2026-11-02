import { Lesson } from '@/types/course';

export const pythonLesson4: Lesson = {
  "id": "python-4",
  "moduleSlug": "python",
  "order": 4,
  "title": "Работа с файлами (with open, CSV, JSON) и обработка исключений (try/except/finally)",
  "estimatedMinutes": 30,
  "glossaryTerms": [
    {
      "term": "Контекстный менеджер",
      "definition": "Объект Python, управляющий выделением и гарантированным освобождением ресурсов с помощью протокола __enter__ и __exit__."
    },
    {
      "term": "Dead Letter Queue (DLQ)",
      "definition": "Очередь или хранилище для сообщений и записей, которые не удалось распарсить или обработать штатным пайплайном."
    },
    {
      "term": "Exception Chaining",
      "definition": "Конструкция raise NewError from original_error, связывающая контекст исходного исключения с новым для удобства отладки."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "event_stream_files",
      "description": "Сырые файлы JSON-L логов, поступающие из очереди сообщений",
      "columns": [
        {
          "name": "file_id",
          "type": "INT",
          "keyType": "PK"
        },
        {
          "name": "file_path",
          "type": "VARCHAR(255)"
        },
        {
          "name": "line_count",
          "type": "INT"
        }
      ],
      "sampleRows": [
        {
          "file_id": 1,
          "file_path": "s3://bucket/events/2026-11-01.jsonl",
          "line_count": 50000
        },
        {
          "file_id": 2,
          "file_path": "s3://bucket/events/2026-11-02.jsonl",
          "line_count": 75000
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Работа с файлами, JSON и отказоустойчивость: with open и try/except\n\nВ реальном мире внешние API падают, файлы приходят поврежденными, а сеть рвется. Пайплайн обязан быть отказоустойчивым.\n\n#### 1. Контекстные менеджеры: with open()\nНикогда не вызывайте `f = open()` и `f.close()` вручную! Если между ними произойдет ошибка, файл останется открытым в дескрипторах ОС.\nКонструкция `with` гарантирует вызов метода `__exit__` и закрытие файлового дескриптора в любой ситуации:\n```python\nwith open('data.json', 'r', encoding='utf-8') as f:\n    events = json.load(f)\n```\n\n#### 2. Работа с JSON\n* `json.loads(str_data)` — десериализация строки в Python-объект.\n* `json.dumps(obj, ensure_ascii=False)` — сериализация объекта в JSON-строку.\n* `json.load(file_obj)` / `json.dump(obj, file_obj)` — работа напрямую с файловыми потоками.\n\n#### 3. Преступление в проде: except Exception: pass\n«Проглатывание» ошибок глушит критические сбои. Пайплайн считает, что отработал на 100%, но половина данных потеряна:\n```python\n# ❌ ПРЕСТУПЛЕНИЕ:\ntry:\n    process_batch(data)\nexcept Exception:\n    pass\n\n# ✅ СТАНДАРТ DATA ENGINEERING:\ntry:\n    record = json.loads(line)\n    valid_records.append(record)\nexcept (json.JSONDecodeError, TypeError) as err:\n    logger.warning(\"Corrupted JSON line: %s, error: %s\", line, err)\n    dead_letter_queue.append(line)\n```"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Электронный замок сейфа",
      "content": "Контекстный менеджер with — это как электронный замок в банковском хранилище: дверь захлопнется автоматически, когда вы выйдете или если погаснет свет, предотвращая утечку ресурсов."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Паттерны обработки ошибок в ETL-пайплайнах",
        "beforeDescription": "Уязвимость к сбоям и читаемость логов",
        "beforeColumns": [
          "exception_pattern",
          "pipeline_safety",
          "debuggability"
        ],
        "beforeRows": [
          [
            "except: pass",
            "Extremely dangerous",
            "Zero visibility"
          ],
          [
            "except ValueError",
            "Safe & targeted",
            "High"
          ],
          [
            "finally: close()",
            "Resource leak proof",
            "Predictable"
          ]
        ],
        "afterDescription": "Стандарты надежности для production конвейеров",
        "afterColumns": [
          "pattern",
          "behavior_on_error",
          "de_standard"
        ],
        "afterRows": [
          [
            "try/except/log",
            "Send to DLQ",
            "Required in Prod"
          ],
          [
            "with open()",
            "Auto close FD",
            "Mandatory"
          ],
          [
            "raise from e",
            "Preserve traceback",
            "Best Practice"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Проглоченные исключения и потеря данных",
      "content": "Конструкция `except: pass` в парсере платежей скрыла изменение формата даты у провайдера. 300 000 платежей не записались в БД, а бухгалтерия не сходилась неделю."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Всегда ли выполняется блок finally?",
      "content": "**Ответ:** Блок `finally` выполняется абсолютно всегда — даже если в блоке `try` сработал оператор `return`, произошло необработанное исключение или завершился цикл. Единственное исключение — жесткое завершение процесса через `os._exit()` или падение виртуальной машины."
    }
  ],
  "taskDescription": "Реализуйте функцию safe_parse_json_events(raw_lines: list[str]) -> tuple[list[dict], list[str]], которая принимает список текстовых строк, построчно десериализует их через json.loads(), собирает валидные словари в список valid_events, а некорректные строки (вызывающие json.JSONDecodeError или TypeError) отправляет в corrupted_lines (DLQ), и возвращает кортеж (valid_events, corrupted_lines).",
  "seedCode": "raw_event_lines = [\n    '{\"event_id\": \"e_1\", \"user_id\": 42, \"action\": \"login\"}',\n    '{\"event_id\": \"e_2\", \"corrupted_json',\n    '{\"event_id\": \"e_3\", \"user_id\": 99, \"action\": \"logout\"}',\n    'broken string not json'\n]",
  "initialCode": "import json\n\n# Напишите функцию safe_parse_json_events\ndef safe_parse_json_events(\n    raw_lines: list[str]\n) -> tuple[list[dict], list[str]]:\n    # 1. Сформируйте списки valid_events и corrupted_lines\n    # 2. Обработайте каждую строку в try / except (json.JSONDecodeError, TypeError)\n    # 3. Верните кортеж (valid_events, corrupted_lines)\n    pass",
  "solutionCode": "import json\n\ndef safe_parse_json_events(\n    raw_lines: list[str]\n) -> tuple[list[dict], list[str]]:\n    valid_events = []\n    corrupted_lines = []\n    for line in raw_lines:\n        try:\n            data = json.loads(line)\n            valid_events.append(data)\n        except (json.JSONDecodeError, TypeError):\n            corrupted_lines.append(line)\n    return valid_events, corrupted_lines",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "try",
      "except",
      "json.loads"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #204: Потеря битых сообщений из-за голой заглушки pass",
    "incidentDescription": "В обработчике очереди сообщений стоял блок except Exception: pass, из-за чего битые события терялись навсегда без фиксации в DLQ.",
    "buggyCode": "import json\n\ndef safe_parse_json_events(\n    raw_lines: list[str]\n) -> tuple[list[dict], list[str]]:\n    valid_events = []\n    for line in raw_lines:\n        try:\n            data = json.loads(line)\n            valid_events.append(data)\n        except Exception:\n            pass\n    return valid_events, []",
    "fixHint": "В блоке except добавляйте поврежденную строку в список corrupted_lines и возвращайте оба списка.",
    "solutionCode": "import json\n\ndef safe_parse_json_events(\n    raw_lines: list[str]\n) -> tuple[list[dict], list[str]]:\n    valid_events = []\n    corrupted_lines = []\n    for line in raw_lines:\n        try:\n            data = json.loads(line)\n            valid_events.append(data)\n        except (json.JSONDecodeError, TypeError):\n            corrupted_lines.append(line)\n    return valid_events, corrupted_lines",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Создайте два пустых списка: valid_events = [] и corrupted_lines = [].",
    "В цикле for line in raw_lines оберните вызов json.loads(line) в конструкцию try-except.",
    "В блоке except (json.JSONDecodeError, TypeError): делайте corrupted_lines.append(line)."
  ]
};
