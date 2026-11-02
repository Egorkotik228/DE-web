import { Lesson } from '@/types/course';

export const airflowLesson3: Lesson = {
  "id": "airflow-3",
  "moduleSlug": "airflow",
  "order": 3,
  "title": "Обмен данными и ветвления: Механика XCom, кастомные бэкенды и условные ветвления (@task.branch)",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "XCom (Cross-Communication)",
      "definition": "Встроенный механизм Airflow для передачи небольших порций метаданных (ID партиций, количество строк, пути к файлам в S3) между задачами через сериализацию в JSON."
    },
    {
      "term": "Custom XCom Backend",
      "definition": "Расширение Airflow, переопределяющее хранение сериализованных объектов: вместо метабазы Postgres тяжелые данные автоматически сохраняются в S3/GCS, а в XCom пишется только URI."
    },
    {
      "term": "@task.branch (Branching)",
      "definition": "Механизм условного ветвления в графе DAG, позволяющий функции вернуть task_id следующей задачи для исполнения, переводя остальные альтернативные ветки в статус skipped."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "airflow_xcom",
      "description": "Таблица xcom метабазы Airflow для хранения сериализованных метаданных",
      "columns": [
        {
          "name": "key",
          "type": "VARCHAR(512)",
          "keyType": "PK"
        },
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
          "name": "value",
          "type": "BYTEA"
        }
      ],
      "sampleRows": [
        {
          "key": "return_value",
          "task_id": "check_row_count",
          "dag_id": "etl_orders",
          "value": "b'{\"rows\": 14500}'"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Передача данных между задачами: Физика XCom и условные ветвления\n\nКаждая задача в Airflow запускается в **изолированном процессе или отдельном контейнере**. У них нет общей оперативной памяти. Механизм **XCom** (Cross-Communication) позволяет таскам обмениваться сообщениями через метабазу.\n\n#### 1. Ограничения XCom по умолчанию:\n* В PostgreSQL поле `xcom.value` имеет тип `BYTEA` (ограничение до 1 ГБ, но уже при 10 МБ база начинает деградировать).\n* В MySQL лимит `BLOB` составляет всего 64 КБ!\n* ❌ **Антипаттерн:** передавать через XCom DataFrame Pandas или список из миллиона словарей.\n* ✅ **Best Practice:** передавать через XCom только **метаданные**: `\"s3://bucket/2026-11-01/orders.parquet\"` или `{\"partition_id\": \"2026-11-01\", \"row_count\": 50000}`.\n\n#### 2. Ветвление с декоратором `@task.branch`:\nВ реальных пайплайнах путь выполнения зависит от объема данных: если данных нет — отправить алерт, если данные есть — запустить dbt:\n\n```python\n@task.branch\ndef check_dataset_size(row_count: int) -> str:\n    if row_count > 0:\n        return \"process_dbt_models\"\n    return \"send_slack_empty_alert\"\n```\nВсе задачи на невыбранных ветках автоматически получают статус **`skipped`**, а задачи после объединения должны иметь правило `trigger_rule=\"none_failed_min_one_success\"`."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Ссылка на склад вместо самого товара",
      "content": "XCom похож на курьера с запиской: курьер не должен тащить 50 коробок с холодильниками на спине через офис (метабазу Postgres). Курьер передает следующему водителю маленькую накладную с адресом: «Забери груз из ячейки №4 на складе S3»."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение способов передачи данных между тасками",
        "beforeDescription": "Передача тяжелых данных напрямую через XCom",
        "beforeColumns": [
          "data_payload",
          "metadata_db_impact",
          "failure_symptom"
        ],
        "beforeRows": [
          [
            "Pandas DataFrame in XCom",
            "Bloats PostgreSQL database",
            "OOM on metadata DB serialize"
          ],
          [
            "Large JSON payload (100MB)",
            "Slow webserver grid view",
            "Scheduler query timeouts"
          ],
          [
            "Binary image or parquet",
            "Locks task_instance tables",
            "Cluster-wide outage"
          ]
        ],
        "afterDescription": "Передача через Object Storage (S3 / Custom Backend)",
        "afterColumns": [
          "data_payload",
          "metadata_db_impact",
          "failure_symptom"
        ],
        "afterRows": [
          [
            "S3 URI string in XCom",
            "< 100 bytes in PostgreSQL",
            "Instant sub-millisecond query"
          ],
          [
            "Data saved to Lakehouse",
            "Zero metadata DB bloat",
            "Webserver remains lightning fast"
          ],
          [
            "Decoupled compute/storage",
            "Clean isolated task I/O",
            "100% resilient architecture"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: `return df` в TaskFlow функции",
      "content": "Инженер вернул `return pandas_df` из функции `@task`. Airflow автоматически попытался сериализовать датафрейм в JSON и залить в Postgres. Метабаза раздулась на 40 ГБ за 2 недели, бэкапы перестали влезать на диск, а UI Airflow начал открываться по 45 секунд. Возвращайте только примитивные типы (str, int, dict с путями к файлам)!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Зачем нужен `trigger_rule=\"none_failed_min_one_success\"` после ветвления @task.branch?",
      "content": "**Ответ:** По умолчанию у всех задач стоит `trigger_rule=\"all_success\"` (все прямые родители должны завершиться успешно). После ветвления одна из веток неизбежно получает статус `skipped`. Если не изменить trigger_rule у замыкающей задачи, она тоже уйдет в `skipped` по каскаду, так как не все ее родители были `success`."
    }
  ],
  "taskDescription": "Напишите ветвящийся DAG на базе TaskFlow API:\n1. Создайте задачу генерации данных '@task def get_metrics() -> dict:', возвращающую `{'anomaly_detected': True, 'score': 98}`.\n2. Создайте задачу ветвления '@task.branch def evaluate_branch(metrics: dict) -> str:', которая возвращает 'trigger_incident', если `metrics['anomaly_detected']` равен True, иначе 'log_normal_state'.\n3. Создайте две терминальные задачи: '@task def trigger_incident():' и '@task def log_normal_state():'.\n4. Постройте зависимости в DAG.",
  "seedCode": "from airflow.decorators import dag, task\nfrom datetime import datetime, timezone\n\n# Напишите ветвящийся DAG\n",
  "initialCode": "from airflow.decorators import dag, task\nfrom datetime import datetime, timezone\n\n@dag(schedule=None, start_date=datetime(2026, 1, 1, tzinfo=timezone.utc), catchup=False)\ndef anomaly_detection_dag():\n    @task\n    def get_metrics() -> dict:\n        return {'anomaly_detected': True, 'score': 98}\n\n    @task.branch\n    def evaluate_branch(metrics: dict) -> str:\n        if metrics.get('anomaly_detected'):\n            return 'trigger_incident'\n        return 'log_normal_state'\n\n    @task\n    def trigger_incident():\n        print(\"Incident triggered!\")\n\n    @task\n    def log_normal_state():\n        print(\"System metrics are normal.\")\n\n    m = get_metrics()\n    branch = evaluate_branch(m)\n    branch >> [trigger_incident(), log_normal_state()]\n\nanomaly_detection_dag()",
  "solutionCode": "from airflow.decorators import dag, task\nfrom datetime import datetime, timezone\n\n@dag(schedule=None, start_date=datetime(2026, 1, 1, tzinfo=timezone.utc), catchup=False)\ndef anomaly_detection_dag():\n    @task\n    def get_metrics() -> dict:\n        return {'anomaly_detected': True, 'score': 98}\n\n    @task.branch\n    def evaluate_branch(metrics: dict) -> str:\n        if metrics.get('anomaly_detected'):\n            return 'trigger_incident'\n        return 'log_normal_state'\n\n    @task\n    def trigger_incident():\n        print(\"Incident triggered!\")\n\n    @task\n    def log_normal_state():\n        print(\"System metrics are normal.\")\n\n    m = get_metrics()\n    branch = evaluate_branch(m)\n    branch >> [trigger_incident(), log_normal_state()]\n\nanomaly_detection_dag()",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "@task.branch",
      "evaluate_branch",
      "trigger_incident",
      "log_normal_state"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #803: Каскадный пропуск финальной задачи после условного ветвления",
    "incidentDescription": "После Branch-оператора финальная задача отправки отчета получила статус skipped, хотя одна из веток выполнилась успешно.",
    "buggyCode": "join_task = EmptyOperator(task_id='join_task') # со стандартным trigger_rule='all_success'",
    "fixHint": "Установите trigger_rule='none_failed_min_one_success' для финальной задачи объединения веток.",
    "solutionCode": "join_task = EmptyOperator(task_id='join_task', trigger_rule='none_failed_min_one_success')",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Используйте декоратор `@task.branch` для функции условного выбора пути.",
    "Функция ветвления должна возвращать строку с `task_id` целевой задачи.",
    "Свяжите ветвление с вариантами через список: `branch >> [trigger_incident(), log_normal_state()]`."
  ]
};
