import { Lesson } from '@/types/course';

export const pythonLesson3: Lesson = {
  "id": "python-3",
  "moduleSlug": "python",
  "order": 3,
  "title": "Циклы for/while, List/Dict Comprehensions и функции (def, *args, **kwargs, type hints)",
  "estimatedMinutes": 25,
  "glossaryTerms": [
    {
      "term": "List / Dict Comprehension",
      "definition": "Краткий и оптимизированный синтаксис построения списков и словарей на основе существующих итерируемых объектов с фильтрацией."
    },
    {
      "term": "Mutable Default Argument",
      "definition": "Антипаттерн в Python, когда изменяемый объект задается значением по умолчанию функции и разделяется между всеми вызовами."
    },
    {
      "term": "Type Hints",
      "definition": "Синтаксис аннотаций типов (PEP 484), позволяющий статически валидировать типы параметров и возвращаемых значений функций."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "telemetry_metrics",
      "description": "Входной поток сырых метрик серверов БД",
      "columns": [
        {
          "name": "metric_id",
          "type": "INT",
          "keyType": "PK"
        },
        {
          "name": "metric_name",
          "type": "VARCHAR(100)"
        },
        {
          "name": "metric_value",
          "type": "INT"
        }
      ],
      "sampleRows": [
        {
          "metric_id": 1,
          "metric_name": "cpu_utilization",
          "metric_value": 85
        },
        {
          "metric_id": 2,
          "metric_name": "network_rx_mb",
          "metric_value": 1200
        },
        {
          "metric_id": 3,
          "metric_name": "memory_free_mb",
          "metric_value": 450
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Циклы, генераторы коллекций и функции с type hints\n\nВ кодовой базе дата-инженера функции должны быть детерминированными, строго типизированными и легко тестируемыми.\n\n#### 1. List и Dict Comprehensions\nГенераторы списков и словарей работают на 15–30% быстрее обычных циклов `for` с вызовом `.append()` за счет оптимизации на уровне CPython (байткод-инструкция `LIST_APPEND` вместо регулярного вызова метода через стек):\n```python\n# Быстрая и чистая трансформация:\nvalid_items = [x[\"id\"] for x in payload if x[\"is_active\"]]\nid_to_price = {x[\"id\"]: x[\"price\"] for x in payload if x[\"price\"] > 0}\n```\n\n#### 2. Функции, *args, **kwargs и Type Hints\n* `*args` упаковывает лишние позиционные аргументы в кортеж (`tuple`).\n* `**kwargs` упаковывает именованные аргументы в словарь (`dict`).\n* Аннотации типов (`typing`): помогают IDE и статическим анализаторам (`mypy`) выявлять критические баги до деплоя в прод.\n\n#### 3. Смертельная ловушка: изменяемый дефолтный аргумент\nВ Python аргументы по умолчанию вычисляются **один раз в момент определения функции**, а не при каждом ее вызове:\n```python\n# ❌ КАТАСТРОФА В ПРОДЕ:\ndef append_event(event: dict, buffer: list = []):\n    buffer.append(event)\n    return buffer\n# Все вызовы делят один и тот же список buffer в памяти процесса!\n\n# ✅ ПРАВИЛЬНО:\ndef append_event(event: dict, buffer: list | None = None):\n    if buffer is None:\n        buffer = []\n    buffer.append(event)\n    return buffer\n```"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Штамповочный пресс против ручной резки",
      "content": "List Comprehension — это как промышленный штамп для деталей: положил лист металла, нажал рычаг — получил готовые детали. Обычный цикл с .append() — это ручное вырезание каждой детали ножницами."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение подходов к трансформации списков и словарей",
        "beforeDescription": "Синтаксическая чистота и производительность",
        "beforeColumns": [
          "approach",
          "syntax_lines",
          "execution_speed"
        ],
        "beforeRows": [
          [
            "for loop + append",
            "4 lines",
            "Standard"
          ],
          [
            "list comprehension",
            "1 line",
            "15-30% faster"
          ],
          [
            "map + lambda",
            "1 line",
            "Hard to read"
          ]
        ],
        "afterDescription": "Отраслевые рекомендации в Data Engineering",
        "afterColumns": [
          "construct",
          "idiomatic_score",
          "recommended_use"
        ],
        "afterRows": [
          [
            "List comp",
            "High (Pythonic)",
            "Transform & filter"
          ],
          [
            "Dict comp",
            "High (Pythonic)",
            "Index building"
          ],
          [
            "def + types",
            "Enterprise",
            "Reusable pipeline"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Опасность изменяемых аргументов по умолчанию",
      "content": "Мутабельный дефолтный аргумент `buffer=[]` в Airflow-таске смешал события клиентов разных тенантов. Из-за этого персональные данные попали в чужой аналитический отчет, что привело к нарушению GDPR."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Почему нельзя использовать [] или {} по умолчанию в функциях?",
      "content": "**Ответ:** Аргументы по умолчанию в Python связываются с объектом функции при выполнении инструкции `def` (в момент загрузки модуля). Если объект изменяем (list, dict), любые его мутации сохраняются между последующими вызовами функции."
    }
  ],
  "taskDescription": "Напишите функцию clean_and_filter_metrics(metrics: list[dict], min_threshold: int = 100) -> dict[str, int], которая с помощью Dict Comprehension отбирает метрики со значением m['value'] >= min_threshold и возвращает словарь с удвоенным значением: {m['name']: m['value'] * 2}.",
  "seedCode": "metrics_raw = [\n    {\"name\": \"cpu_utilization\", \"value\": 85},\n    {\"name\": \"memory_free_mb\", \"value\": 450},\n    {\"name\": \"disk_io_errors\", \"value\": 0},\n    {\"name\": \"network_rx_mb\", \"value\": 1200},\n]",
  "initialCode": "# Напишите функцию clean_and_filter_metrics\ndef clean_and_filter_metrics(\n    metrics: list[dict], min_threshold: int = 100\n) -> dict[str, int]:\n    # Используйте dict comprehension:\n    # Оставьте только метрики с value >= min_threshold\n    # Преобразуйте значение: item['name']: item['value'] * 2\n    pass",
  "solutionCode": "def clean_and_filter_metrics(\n    metrics: list[dict], min_threshold: int = 100\n) -> dict[str, int]:\n    return {\n        m[\"name\"]: m[\"value\"] * 2\n        for m in metrics\n        if m[\"value\"] >= min_threshold\n    }",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "for",
      "in",
      "if"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #203: Утечка данных между вызовами таски из-за cache={}",
    "incidentDescription": "Функция фильтрации метрик содержала мутабельный дефолтный словарь cache: dict = {}, из-за чего результаты предыдущего запуска подмешивались к текущему.",
    "buggyCode": "def clean_and_filter_metrics(\n    metrics: list[dict], min_threshold: int = 100, cache: dict = {}\n) -> dict[str, int]:\n    for m in metrics:\n        if m[\"value\"] >= min_threshold:\n            cache[m[\"name\"]] = m[\"value\"] * 2\n    return cache",
    "fixHint": "Уберите параметр cache и перепишите функцию в одну строку через чистый Dict Comprehension.",
    "solutionCode": "def clean_and_filter_metrics(\n    metrics: list[dict], min_threshold: int = 100\n) -> dict[str, int]:\n    return {\n        m[\"name\"]: m[\"value\"] * 2\n        for m in metrics\n        if m[\"value\"] >= min_threshold\n    }",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Синтаксис Dict Comprehension: {key_expr: val_expr for item in collection if condition}.",
    "Ключом словаря должно быть m[\"name\"], а значением — m[\"value\"] * 2.",
    "Условие фильтрации: if m[\"value\"] >= min_threshold."
  ]
};
