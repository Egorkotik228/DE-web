import { Lesson } from '@/types/course';

export const airflowLesson1: Lesson = {
  "id": "airflow-1",
  "moduleSlug": "airflow",
  "order": 1,
  "title": "Архитектура Apache Airflow: Webserver, Scheduler, Metadata DB, Triggerer и Executors",
  "estimatedMinutes": 40,
  "glossaryTerms": [
    {
      "term": "Scheduler (Планировщик Airflow)",
      "definition": "Центральный многопоточный демон, который непрерывно парсит DAG-файлы, отслеживает интервалы расписания и отправляет готовые задачи (state: queued) в очередь исполнителя."
    },
    {
      "term": "Metadata Database (Метабаза)",
      "definition": "Реляционная СУБД (PostgreSQL / MySQL), хранящая состояние всех запусков (DAG Runs, Task Instances), переменные, подключения, логи и XCom."
    },
    {
      "term": "Celery vs KubernetesExecutor",
      "definition": "CeleryExecutor использует пул постоянно запущенных воркеров через Redis/RabbitMQ. KubernetesExecutor поднимает отдельный изолированный pod под каждую задачу и гасит его после завершения."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "airflow_task_instances",
      "description": "Таблица task_instance метабазы Airflow: фиксация статусов исполнения",
      "columns": [
        {
          "name": "task_id",
          "type": "VARCHAR(64)",
          "keyType": "PK"
        },
        {
          "name": "dag_id",
          "type": "VARCHAR(64)",
          "keyType": "PK"
        },
        {
          "name": "run_id",
          "type": "VARCHAR(128)",
          "keyType": "PK"
        },
        {
          "name": "state",
          "type": "VARCHAR(20)"
        }
      ],
      "sampleRows": [
        {
          "task_id": "extract_crm",
          "dag_id": "daily_sync",
          "run_id": "scheduled__2026-11-01T00:00:00+00:00",
          "state": "success"
        },
        {
          "task_id": "transform_dbt",
          "dag_id": "daily_sync",
          "run_id": "scheduled__2026-11-01T00:00:00+00:00",
          "state": "running"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Архитектура Apache Airflow: Оркестратор, а не движок вычислений\n\nГлавная аксиома дата-инженера: **Airflow не предназначен для передачи тяжелых данных через себя!** Airflow — это диспетчерская вышка аэропорта. Он координирует, когда взлетать самолетам (Spark-джобы, dbt-модели, выгрузки из ClickHouse), проверяет готовность взлетно-посадочной полосы и фиксирует статус рейса.\n\n#### 5 ключевых компонентов кластера Airflow:\n1. **Scheduler:** непрерывно опрашивает папку `dags/`, вычисляет зависимости графа и переводит таски из `scheduled` в `queued`.\n2. **Webserver:** веб-интерфейс (Flask/Gunicorn) для мониторинга DAG Runs, чтения логов и ручного перезапуска.\n3. **Metadata Database (PostgreSQL):** единая точка правды, где фиксируется каждый статус таски.\n4. **Triggerer:** легковесный асинхронный демон (asyncio), удерживающий тысячи отложенных задач (Deferrable Operators / Sensors) без расхода памяти воркеров.\n5. **Executor & Workers:** архитектурный движок выполнения:\n   - **SequentialExecutor:** однопоточный (SQLite), только для локального ознакомления.\n   - **LocalExecutor:** параллельные процессы на одном сервере через IPC.\n   - **CeleryExecutor:** распределенная очередь задач (Redis + фиксированный пул воркеров).\n   - **KubernetesExecutor:** динамический pod на каждую таску с индивидуальными ресурсами (CPU/RAM)."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Диспетчер таксопарка",
      "content": "Scheduler — это диспетчер такси: он смотрит на часы и карту заказов. Метабаза — бортовой журнал в офисе. CeleryExecutor — это штат наемных водителей, ждущих заказ на стоянке (воркеры всегда запущены). А KubernetesExecutor — это вызов машины из каршеринга: машина открывается только на время поездки (pod создается), а по прибытии паркуется и исчезает."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение исполнителей CeleryExecutor и KubernetesExecutor",
        "beforeDescription": "CeleryExecutor (Пул фиксированных воркеров)",
        "beforeColumns": [
          "workload_aspect",
          "resource_usage",
          "startup_latency"
        ],
        "beforeRows": [
          [
            "Fixed worker pool",
            "Static RAM allocated 24/7",
            "Sub-second task start"
          ],
          [
            "Dependency conflicts",
            "Single Python environment",
            "Library collisions"
          ],
          [
            "Burst workload spike",
            "Queue gets backlogged",
            "Slow down during peak"
          ]
        ],
        "afterDescription": "KubernetesExecutor (Динамические поды на задачу)",
        "afterColumns": [
          "workload_aspect",
          "resource_usage",
          "startup_latency"
        ],
        "afterRows": [
          [
            "Elastic pod per task",
            "Pay only for running tasks",
            "10-20 sec pod spinup"
          ],
          [
            "Custom Docker image",
            "Isolated dependencies per task",
            "Zero library conflict"
          ],
          [
            "Burst workload spike",
            "Scales to hundreds of nodes",
            "Auto-scaled cluster capacity"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Выполнение тяжелых вычислений внутри оператора Airflow",
      "content": "Инженер загрузил 10 ГБ данных в `pandas.read_sql()` прямо внутри `PythonOperator` на Celery воркере. Воркер съел всю память ноды, сработал OOM Killer, и вместе с упавшей таской умерли еще 15 параллельно выполнявшихся чужих задач. Airflow должен вызывать внешние системы (KubernetesPodOperator, SparkSubmitOperator, Trino/ClickHouse), а не молотить терабайты локально!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Зачем в Airflow 2.2+ появился демон Triggerer?",
      "content": "**Ответ:** Классические сенсоры и долгие операции блокируют целый рабочий слот воркера (worker slot), просто засыпая на `time.sleep()`. Triggerer запускает тысячи асинхронных корутин (Python `asyncio`) в одном процессе. Когда таска ждет появления файла в S3 или завершения джоба в Spark, она освобождает воркер и уходит в Triggerer, экономя десятки тысяч долларов на серверах."
    }
  ],
  "taskDescription": "Сконфигурируйте базовое окружение Apache Airflow для распределенного кластера:\n1. Задайте исполнитель 'CeleryExecutor' в переменной конфигурации 'AIRFLOW__CORE__EXECUTOR'.\n2. Задайте строку подключения к метабазе PostgreSQL в 'AIRFLOW__DATABASE__SQL_ALCHEMY_CONN'.\n3. Задайте брокер очередей Redis в 'AIRFLOW__CELERY__BROKER_URL'.\n\nНапишите Python-словарь 'airflow_config' с правильными ключами переменных окружения.",
  "seedCode": "# Настройте конфигурационные переменные для CeleryExecutor кластера\nairflow_config = {\n    'AIRFLOW__CORE__EXECUTOR': '...',\n    'AIRFLOW__DATABASE__SQL_ALCHEMY_CONN': '...',\n    'AIRFLOW__CELERY__BROKER_URL': '...'\n}",
  "initialCode": "airflow_config = {\n    'AIRFLOW__CORE__EXECUTOR': 'CeleryExecutor',\n    'AIRFLOW__DATABASE__SQL_ALCHEMY_CONN': 'postgresql+psycopg2://airflow:airflow@postgres:5432/airflow',\n    'AIRFLOW__CELERY__BROKER_URL': 'redis://:redis_secret@redis:6379/0'\n}",
  "solutionCode": "airflow_config = {\n    'AIRFLOW__CORE__EXECUTOR': 'CeleryExecutor',\n    'AIRFLOW__DATABASE__SQL_ALCHEMY_CONN': 'postgresql+psycopg2://airflow:airflow@postgres:5432/airflow',\n    'AIRFLOW__CELERY__BROKER_URL': 'redis://:redis_secret@redis:6379/0'\n}",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "CeleryExecutor",
      "postgresql+psycopg2://",
      "redis://"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #801: Запуск продакшна на SequentialExecutor с базой SQLite",
    "incidentDescription": "Команда развернула Airflow со стандартным sqlite метастором. При запуске второго DAG база заблокировалась с ошибкой 'database is locked', и пайплайны встали.",
    "buggyCode": "AIRFLOW__CORE__EXECUTOR=SequentialExecutor\nAIRFLOW__CORE__SQL_ALCHEMY_CONN=sqlite:////opt/airflow/airflow.db",
    "fixHint": "Переключитесь на CeleryExecutor или LocalExecutor и подключите PostgreSQL.",
    "solutionCode": "AIRFLOW__CORE__EXECUTOR=LocalExecutor\nAIRFLOW__DATABASE__SQL_ALCHEMY_CONN=postgresql+psycopg2://airflow:airflow@postgres:5432/airflow",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Для CeleryExecutor требуется брокер очередей (Redis или RabbitMQ).",
    "Строка подключения к Postgres использует диалект `postgresql+psycopg2://...`.",
    "Задайте точные ключи: 'AIRFLOW__CORE__EXECUTOR', 'AIRFLOW__DATABASE__SQL_ALCHEMY_CONN', 'AIRFLOW__CELERY__BROKER_URL'."
  ]
};
