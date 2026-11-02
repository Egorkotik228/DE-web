import { Lesson } from '@/types/course';

export const pythonLesson1: Lesson = {
  "id": "python-1",
  "moduleSlug": "python",
  "order": 1,
  "title": "Основы Python с нуля: Переменные, типы данных (int, float, str, bool), строки и условия if/elif/else",
  "estimatedMinutes": 20,
  "glossaryTerms": [
    {
      "term": "Динамическая типизация",
      "definition": "Механизм, при котором тип переменной связывается со значением в рантайме, а не декларируется жестко при объявлении."
    },
    {
      "term": "f-строки (f-strings)",
      "definition": "Форматированные строковые литералы, позволяющие встраивать выражения Python прямо внутрь строк с префиксом f."
    },
    {
      "term": "Неизменяемость (Immutability)",
      "definition": "Свойство объектов (str, int, tuple), запрещающее их модификацию в памяти после создания."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "access_logs_raw",
      "description": "Входной поток текстовых логов сервиса авторизации",
      "columns": [
        {
          "name": "log_id",
          "type": "INT",
          "keyType": "PK"
        },
        {
          "name": "raw_line",
          "type": "VARCHAR(255)"
        },
        {
          "name": "service_name",
          "type": "VARCHAR(50)"
        }
      ],
      "sampleRows": [
        {
          "log_id": 1,
          "raw_line": "GET /api/v1/orders 200 120ms",
          "service_name": "gateway"
        },
        {
          "log_id": 2,
          "raw_line": "POST /api/v1/checkout 500 450ms",
          "service_name": "billing"
        },
        {
          "log_id": 3,
          "raw_line": "GET /health 200 5ms",
          "service_name": "monitor"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Основы Python для Data Engineer: Переменные и типизация\n\nВ дата-инженерии Python используется как главный язык для оркестрации (Airflow, Dagster), написания коннекторов к API и потоковой очистки данных.\n\n#### 1. Базовые типы данных\n* `int` — целочисленные значения (идентификаторы, счетчики событий, timestamp в секундах).\n* `float` — числа с плавающей точкой. *Внимание:* в финансовых расчетах `float` опасен из-за погрешностей стандарта IEEE 754 (например `0.1 + 0.2 != 0.3`). Деньги хранят в копейках (`int`) или используют `decimal.Decimal`.\n* `str` — неизменяемые строки Unicode.\n* `bool` — логические значения `True` и `False`.\n\n#### 2. Методы строк в пайплайнах очистки\nПри парсинге сырых выгрузок и логов постоянно применяются методы:\n* `s.strip()` — удаляет пробелы, табуляции и символы перевода строки `\\n` по краям.\n* `s.split(delimiter)` — разбивает строку на список по разделителю (например по запятой в CSV).\n* `s.lower()` / `s.upper()` — нормализация регистра перед сравнением.\n* `f\"{var}\"` — f-строки для сборки путей в S3/HDFS и параметризации SQL-запросов.\n\n#### 3. Условия if/elif/else и операторы сравнения\nКонструкции ветвления направляют поток обработки данных:\n```python\nif status_code == 200:\n    process_payload(response)\nelif status_code in (429, 503):\n    schedule_retry(response)\nelse:\n    send_to_dlq(response)\n```"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Бирки на складских коробках",
      "content": "Переменная в Python — это не коробка, куда физически кладут вещь, а бирка (ярлык) со ссылкой на объект в оперативной памяти (Heap). Несколько переменных могут указывать на один и тот же объект."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Трансформация сырых текстовых строк в структурированный словарь",
        "beforeDescription": "Сырые записи из лог-файла веб-сервера",
        "beforeColumns": [
          "raw_log_entry",
          "expected_method",
          "expected_path"
        ],
        "beforeRows": [
          [
            "GET /api/v1/orders 200",
            "GET",
            "/api/v1/orders"
          ],
          [
            "POST /api/v1/checkout 500",
            "POST",
            "/api/v1/checkout"
          ],
          [
            "GET /health 200",
            "GET",
            "/health"
          ]
        ],
        "afterDescription": "Результат парсинга с приведением типов",
        "afterColumns": [
          "endpoint",
          "status_group",
          "is_error"
        ],
        "afterRows": [
          [
            "/api/v1/orders",
            "2xx",
            "False"
          ],
          [
            "/api/v1/checkout",
            "5xx",
            "True"
          ],
          [
            "/health",
            "2xx",
            "False"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Пробелы и переносы строк в статусах",
      "content": "Сравнение строк без .strip() — классическая ночная авария: условие status == 'COMPLETED' вернет False, если в сыром логе пришло 'COMPLETED\\r\\n'. Пайплайн посчитает успешную транзакцию сбойной и отправит повторный платеж."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: В чем разница между == и is?",
      "content": "**Ответ:** Оператор `==` сравнивает значения объектов через вызов метода `__eq__`, а оператор `is` проверяет идентичность указателей в памяти (`id(a) == id(b)`). В Python `is` следует применять строго для проверки одиночек, таких как `x is None`."
    }
  ],
  "taskDescription": "Напишите функцию parse_log_entry(raw_line: str) -> dict, которая принимает сырую строку лога вида 'POST /api/v1/checkout 500', очищает её от пробелов по краям, разбивает на части и возвращает словарь с ключами method (str), endpoint (str), status_code (int) и is_error (bool: True если status_code >= 400, иначе False).",
  "seedCode": "raw_logs = [\n    \"GET /api/v1/orders 200 120ms\",\n    \"POST /api/v1/checkout 500 450ms\",\n    \"GET /health 200 5ms\",\n    \"PUT /api/v1/users/42 404 15ms\"\n]",
  "initialCode": "# Напишите функцию parse_log_entry\ndef parse_log_entry(raw_line: str) -> dict:\n    # 1. Очистите строку и разбейте на части\n    # 2. Извлеките method, endpoint, status_code (int)\n    # 3. Определите is_error (status_code >= 400)\n    pass",
  "solutionCode": "def parse_log_entry(raw_line: str) -> dict:\n    parts = raw_line.strip().split()\n    method = parts[0]\n    endpoint = parts[1]\n    status_code = int(parts[2])\n    is_error = status_code >= 400\n    return {\n        \"method\": method,\n        \"endpoint\": endpoint,\n        \"status_code\": status_code,\n        \"is_error\": is_error,\n    }",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "strip",
      "split",
      "int"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #201: TypeError при сравнении статус-кода со строкой",
    "incidentDescription": "В микросервисе парсинга логов status_code оставили строкой, из-за чего проверка parts[2] >= 400 упала с фатальной ошибкой TypeError: not supported between instances of str and int.",
    "buggyCode": "def parse_log_entry(raw_line: str) -> dict:\n    parts = raw_line.split()\n    return {\n        \"method\": parts[0],\n        \"endpoint\": parts[1],\n        \"status_code\": parts[2],\n        \"is_error\": parts[2] >= 400,\n    }",
    "fixHint": "Оберните parts[2] в int() перед сравнением и добавьте .strip() перед .split().",
    "solutionCode": "def parse_log_entry(raw_line: str) -> dict:\n    parts = raw_line.strip().split()\n    method = parts[0]\n    endpoint = parts[1]\n    status_code = int(parts[2])\n    is_error = status_code >= 400\n    return {\n        \"method\": method,\n        \"endpoint\": endpoint,\n        \"status_code\": status_code,\n        \"is_error\": is_error,\n    }",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Используйте метод raw_line.strip().split() для получения списка токенов строки.",
    "Не забудьте привести status_code к целому числу через int(parts[2]).",
    "Булев флаг вычисляется выражением status_code >= 400."
  ]
};
