import { Lesson } from '@/types/course';

export const airflowLesson5: Lesson = {
  "id": "airflow-5",
  "moduleSlug": "airflow",
  "order": 5,
  "title": "Надёжность и ретраи: Ошибки, экспоненциальная задержка (exponential_backoff), таймауты и SLA",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Exponential Backoff",
      "definition": "Стратегия повтора упавших задач, при которой задержка между ретраями экспоненциально увеличивается (например, 1 мин -> 2 мин -> 4 мин -> 8 мин), снижая нагрузку на восстанавливающуюся внешнюю систему."
    },
    {
      "term": "execution_timeout",
      "definition": "Параметр оператора Airflow, принудительно прерывающий зависшую задачу по истечении заданного интервала времени (например, timedelta(minutes=30))."
    },
    {
      "term": "SLA (Service Level Agreement)",
      "definition": "Соглашение об уровне сервиса, определяющее максимальное допустимое время готовности данных; при нарушении Airflow отправляет уведомление и регистрирует miss."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "airflow_sla_misses",
      "description": "Журнал нарушений сроков выполнения задач (sla_miss)",
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
          "name": "execution_date",
          "type": "TIMESTAMP",
          "keyType": "PK"
        },
        {
          "name": "notification_sent",
          "type": "BOOLEAN"
        }
      ],
      "sampleRows": [
        {
          "task_id": "build_client_mart",
          "dag_id": "daily_reporting",
          "execution_date": "2026-11-01 03:00:00",
          "notification_sent": true
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Отказоустойчивость в дата-инженерии: Стратегии Ретраев и Защиты от Зависаний\n\nСети нестабильны, внешние API отдают 503 Service Unavailable, а базы данных периодически испытывают кратковременные пики нагрузки. Грамотный инженер проектирует DAG'и так, чтобы временные сбои устранялись автоматически без звонка дежурному ночью.\n\n#### 1. Политика повторов (Retries) в default_args:\nВсе параметры надежности задаются на уровне DAG в словаре `default_args`:\n```python\nfrom datetime import timedelta\n\ndefault_args = {\n    \"owner\": \"data_team\",\n    \"retries\": 3,                         # количество попыток\n    \"retry_delay\": timedelta(minutes=2),  # базовая задержка\n    \"retry_exponential_backoff\": True,    # 2 мин -> 4 мин -> 8 мин\n    \"max_retry_delay\": timedelta(minutes=30),\n    \"execution_timeout\": timedelta(hours=1), # ЖЕСТКИЙ ТАЙМАУТ!\n}\n```\n\n#### 2. Зачем нужен `retry_exponential_backoff`?\nЕсли внешний сервис упал под нагрузкой (Throttling / 429 Too Many Requests), повторять запрос через каждые 5 секунд — значит добить лежащий сервис еще сильнее (Thundering Herd Problem). Экспоненциальная задержка дает внешней системе время оправиться и перезагрузиться.\n\n#### 3. Предотвращение зависших процессов: `execution_timeout`\nЕсли запрос в ClickHouse или Python-скрипт повиснет в мертвом сетевом сокете, задача останется в статусе `running` навсегда. Параметр `execution_timeout` гарантирует, что задача будет принудительно убита и перезапущена по политике ретраев."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Звонок в закрытую дверь",
      "content": "Если вы позвонили в дверь, а вам не открывают: глупо жать на звонок каждую секунду (вас посчитают хулиганом и отключат звонок). Умный гость подождет 1 минуту, затем 5 минут, затем 15 минут. Это и есть экспоненциальный backoff."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение стратегий обработки сбоев",
        "beforeDescription": "Пайплайн без ретраев и таймаутов",
        "beforeColumns": [
          "failure_case",
          "task_behavior",
          "on_call_impact"
        ],
        "beforeRows": [
          [
            "Temporary 502 Bad Gateway",
            "Fails immediately (state: failed)",
            "Wakes up engineer at 3 AM"
          ],
          [
            "Hung network socket",
            "Runs for 48 hours silently",
            "Next scheduled runs blocked"
          ],
          [
            "External API rate limit",
            "Spams API with retries",
            "IP address gets permanently banned"
          ]
        ],
        "afterDescription": "Автоматизированная защита (Backoff + Timeout)",
        "afterColumns": [
          "failure_case",
          "task_behavior",
          "on_call_impact"
        ],
        "afterRows": [
          [
            "Temporary 502 Bad Gateway",
            "Auto-recovers on 2nd retry",
            "Zero alerts, green dashboard"
          ],
          [
            "Hung network socket",
            "Killed by execution_timeout",
            "Self-heals on fresh worker"
          ],
          [
            "External API rate limit",
            "Exponential backoff delay",
            "Smooth throttle recovery"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Бесконечные ретраи неидемпотентного скрипта",
      "content": "Инженер настроил `retries=5` для скрипта, выполняющего `INSERT INTO payments`. На 3-й попытке сеть моргнула: база успела вставить данные, но ответ 200 OK до Airflow не дошел. Airflow повторил таску еще раз, и с клиентов списали деньги повторно! Ретраи допустимы ТОЛЬКО для строго идемпотентных операций."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: В чем разница между `execution_timeout` и `sla` в Apache Airflow?",
      "content": "**Ответ:** `execution_timeout` — это жесткий предохранитель: если задача выполняется дольше указанного времени, Airflow прерывает ее с ошибкой `AirflowTaskTimeout` и запускает ретрай. `sla` — это пассивный мониторинг ожидаемого времени завершения: если задача превысила SLA, она продолжает выполняться, но Airflow регистрирует запись в `sla_miss` и отправляет email/Slack уведомление."
    }
  ],
  "taskDescription": "Сформируйте конфигурационный словарь 'default_args' для промышленного DAG финансовой аналитики:\n1. Назначьте владельца: `'owner': 'finance_de'`.\n2. Установите число попыток: `'retries': 3`.\n3. Установите базовую задержку между попытками: `'retry_delay': timedelta(minutes=2)`.\n4. Включите экспоненциальную задержку: `'retry_exponential_backoff': True`.\n5. Ограничьте максимальную паузу ретрая: `'max_retry_delay': timedelta(minutes=20)`.\n6. Задайте жесткий таймаут выполнения задачи: `'execution_timeout': timedelta(minutes=45)`.\n\nВведите Python-код словаря default_args.",
  "seedCode": "from datetime import timedelta\n\n# Настройте словарь default_args для отказоустойчивого DAG\ndefault_args = {\n    'owner': 'finance_de',\n    # укажите остальные параметры\n}",
  "initialCode": "from datetime import timedelta\n\ndefault_args = {\n    'owner': 'finance_de',\n    'retries': 3,\n    'retry_delay': timedelta(minutes=2),\n    'retry_exponential_backoff': True,\n    'max_retry_delay': timedelta(minutes=20),\n    'execution_timeout': timedelta(minutes=45)\n}",
  "solutionCode": "from datetime import timedelta\n\ndefault_args = {\n    'owner': 'finance_de',\n    'retries': 3,\n    'retry_delay': timedelta(minutes=2),\n    'retry_exponential_backoff': True,\n    'max_retry_delay': timedelta(minutes=20),\n    'execution_timeout': timedelta(minutes=45)\n}",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "'owner': 'finance_de'",
      "'retries': 3",
      "'retry_exponential_backoff': True",
      "'execution_timeout': timedelta(minutes=45)"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #805: Зависание задачи на 3 суток без execution_timeout",
    "incidentDescription": "Сетевой сокет повис при обращении к внешнему SFTP, задача заблокировала Celery воркер на все выходные.",
    "buggyCode": "extract_task = PythonOperator(task_id='extract_task', python_callable=sync_sftp)",
    "fixHint": "Добавьте execution_timeout=timedelta(minutes=30) для принудительного отсечения зависших процессов.",
    "solutionCode": "extract_task = PythonOperator(task_id='extract_task', python_callable=sync_sftp, execution_timeout=timedelta(minutes=30), retries=2)",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Импортируйте `timedelta` из стандартного модуля `datetime`.",
    "Включите экспоненциальную задержку: `'retry_exponential_backoff': True`.",
    "Задайте ограничение времени: `'execution_timeout': timedelta(minutes=45)`."
  ]
};
