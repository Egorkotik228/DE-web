import { Lesson } from '@/types/course';

export const airflowLesson2: Lesson = {
  "id": "airflow-2",
  "moduleSlug": "airflow",
  "order": 2,
  "title": "Анатомия DAG и TaskFlow API: Контекст выполнения, logical_date и декораторы @task",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "TaskFlow API",
      "definition": "Парадигма Airflow 2.0+, позволяющая писать задачи как обычные Python-функции с декоратором @task, автоматически организуя неявные зависимости и передачу XCom."
    },
    {
      "term": "logical_date (ранее execution_date)",
      "definition": "Логическая расчетная дата начала интервала данных (Data Interval Start), за который вычисляются метрики, независимая от физического времени запуска DAG."
    },
    {
      "term": "Data Interval (start / end)",
      "definition": "Временное окно данных, которое обрабатывает конкретный запуск DAG Run (например, с 00:00 до 01:00 для почасового графика)."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "airflow_dag_runs",
      "description": "Снимок запущенных экземпляров DAG (dag_run)",
      "columns": [
        {
          "name": "run_id",
          "type": "VARCHAR(128)",
          "keyType": "PK"
        },
        {
          "name": "logical_date",
          "type": "TIMESTAMP"
        },
        {
          "name": "data_interval_start",
          "type": "TIMESTAMP"
        },
        {
          "name": "data_interval_end",
          "type": "TIMESTAMP"
        }
      ],
      "sampleRows": [
        {
          "run_id": "scheduled__2026-11-01T00:00:00+00:00",
          "logical_date": "2026-11-01 00:00:00",
          "data_interval_start": "2026-11-01 00:00:00",
          "data_interval_end": "2026-11-02 00:00:00"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Анатомия современного DAG: Отказ от бойлерплейта в пользу TaskFlow API\n\nДо Airflow 2.0 создание дагов требовало громоздких операторов (`PythonOperator(task_id='...', python_callable=...)`) и ручной возни с `provide_context=True`. В современном Airflow стандарт разработки — **TaskFlow API** с декораторами `@dag` и `@task`.\n\n#### 1. Классика против TaskFlow API:\n```python\nfrom datetime import datetime, timezone\nfrom airflow.decorators import dag, task\n\n@dag(\n    schedule_interval=\"@daily\",\n    start_date=datetime(2026, 1, 1, tzinfo=timezone.utc),\n    catchup=False,\n    tags=[\"etl\", \"sales\"]\n)\ndef sales_pipeline():\n    @task\n    def extract_orders() -> list[dict]:\n        return [{\"id\": 101, \"amount\": 500}]\n\n    @task\n    def transform_orders(orders: list[dict]) -> int:\n        return sum(o[\"amount\"] for o in orders)\n\n    @task\n    def load_total(total: int):\n        print(f\"Loaded total revenue: {total}\")\n\n    # Зависимости и передача XCom строятся автоматически через вызов функций!\n    raw = extract_orders()\n    metrics = transform_orders(raw)\n    load_total(metrics)\n\nsales_pipeline()\n```\n\n#### 2. Главная ловушка: `logical_date` vs `datetime.now()`\nНикогда не используйте `datetime.now()` внутри логики фильтрации данных в DAG! Если DAG упадет и вы перезапустите его через 3 дня, `datetime.now()` возьмет данные за сегодня, а данные за упавший день будут безвозвратно потеряны.\nВсегда используйте контекстные переменные Airflow: `logical_date` (или макрос `{{ ds }}`), указывающие точную расчетную дату интервала."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Дата на чеке против времени пробития",
      "content": "Представьте бухгалтера, который подводит итоги за 15 октября. Он может сесть за отчет 20 октября, но в отчете он обязан считать чеки СТРОГО за 15 октября. `logical_date` — это дата на чеке (15 октября), а `datetime.now()` — это момент, когда бухгалтер пьет кофе за столом (20 октября)."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение классических операторов и TaskFlow API",
        "beforeDescription": "Классический стиль (Airflow 1.10)",
        "beforeColumns": [
          "syntax_style",
          "xcom_wiring",
          "readability"
        ],
        "beforeRows": [
          [
            "PythonOperator boilerplate",
            "Manual ti.xcom_push / pull",
            "Hard to track data lineage"
          ],
          [
            "Explicit >> bitshift operators",
            "String-based task references",
            "Type hints not supported"
          ],
          [
            "Verbose DAG definition",
            "Lots of repetitive arguments",
            "Lots of visual clutter"
          ]
        ],
        "afterDescription": "TaskFlow API (Airflow 2.x)",
        "afterColumns": [
          "syntax_style",
          "xcom_wiring",
          "readability"
        ],
        "afterRows": [
          [
            "Clean @task python decorators",
            "Implicit automatic XCom pass",
            "Crystal clear data flow"
          ],
          [
            "Functional invocation dependencies",
            "Native Python type annotations",
            "Mypy validation friendly"
          ],
          [
            "Minimal concise code",
            "Self-documenting pipeline",
            "Pythonic and maintainable"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Тяжелый код на верхнем уровне DAG-файла (Top-level code)",
      "content": "Инженер написал подключение к базе данных и тяжелый `requests.get()` прямо в теле DAG-файла вне тела функций тасок. Scheduler парсит КАЖДЫЙ файл каждые 30 секунд. В результате Scheduler начал спамить базу сотнями коннектов в минуту, забил пул соединений и парализовал весь кластер. На верхнем уровне DAG-файла разрешены ТОЛЬКО объявления графа и операторов!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Когда фактически запускается ежедневный DAG со `schedule_interval=\"@daily\"` и `start_date=2026-01-01`?",
      "content": "**Ответ:** В Airflow запуск происходит в КОНЦЕ расчетного интервала (Data Interval End). Для интервала `2026-01-01` данные за сутки полностью собраны только в полночь `2026-01-02 00:00:00`. Именно в этот момент Scheduler создаст DAG Run с `logical_date=2026-01-01`."
    }
  ],
  "taskDescription": "Напишите законченный DAG на базе TaskFlow API для расчета витрины продаж:\n1. Примените декоратор '@dag' со параметрами: 'schedule=\"@daily\"', 'start_date=datetime(2026, 1, 1, tzinfo=timezone.utc)', 'catchup=False'.\n2. Создайте задачу '@task def extract_sales() -> list[int]:', возвращающую список выручки `[1200, 3400, 800]`.\n3. Создайте задачу '@task def calculate_total(sales: list[int]) -> int:', суммирующую элементы через `sum(sales)`.\n4. Свяжите вызовы задач в главной функции DAG и вызовите экземпляр дага.\n\nВведите код DAG с соблюдением стандартов TaskFlow API.",
  "seedCode": "from datetime import datetime, timezone\nfrom airflow.decorators import dag, task\n\n# Напишите TaskFlow DAG\n",
  "initialCode": "from datetime import datetime, timezone\nfrom airflow.decorators import dag, task\n\n@dag(schedule=\"@daily\", start_date=datetime(2026, 1, 1, tzinfo=timezone.utc), catchup=False)\ndef sales_summary_dag():\n    @task\n    def extract_sales() -> list[int]:\n        return [1200, 3400, 800]\n\n    @task\n    def calculate_total(sales: list[int]) -> int:\n        return sum(sales)\n\n    sales_data = extract_sales()\n    calculate_total(sales_data)\n\nsales_summary_dag()",
  "solutionCode": "from datetime import datetime, timezone\nfrom airflow.decorators import dag, task\n\n@dag(schedule=\"@daily\", start_date=datetime(2026, 1, 1, tzinfo=timezone.utc), catchup=False)\ndef sales_summary_dag():\n    @task\n    def extract_sales() -> list[int]:\n        return [1200, 3400, 800]\n\n    @task\n    def calculate_total(sales: list[int]) -> int:\n        return sum(sales)\n\n    sales_data = extract_sales()\n    calculate_total(sales_data)\n\nsales_summary_dag()",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "@dag",
      "@task",
      "extract_sales",
      "calculate_total",
      "sales_summary_dag()"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #802: Зависание Scheduler из-за сетевого запроса на верхнем уровне DAG",
    "incidentDescription": "Инженер сделал вызов requests.get('https://api.crm.com') прямо в глобальной области видимости DAG-файла.",
    "buggyCode": "import requests\nfrom airflow import DAG\n\n# ОШИБКА: выполняется каждые 30 секунд при парсинге DAG!\nactive_clients = requests.get('https://api.crm.com').json()",
    "fixHint": "Перенесите логику сетевого запроса внутрь тела функции с декоратором @task.",
    "solutionCode": "from airflow.decorators import dag, task\n\n@dag(schedule=\"@daily\")\ndef crm_dag():\n    @task\n    def get_clients():\n        import requests\n        return requests.get('https://api.crm.com').json()\n    get_clients()",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Используйте декораторы `@dag(...)` и `@task` из `airflow.decorators`.",
    "Передайте результат первой функции в аргумент второй: `calculate_total(sales_data)`.",
    "Не забудьте в конце вызвать саму функцию DAG: `sales_summary_dag()`."
  ]
};
