import { Lesson } from '@/types/course';

export const airflowLesson4: Lesson = {
  "id": "airflow-4",
  "moduleSlug": "airflow",
  "order": 4,
  "title": "Ожидание данных и сенсоры: FileSensor, SqlSensor, дефицит воркеров и Deferrable Operators",
  "estimatedMinutes": 40,
  "glossaryTerms": [
    {
      "term": "Сенсор (Airflow Sensor)",
      "definition": "Специальный оператор, циклически проверяющий выполнение внешнего условия (появление файла в S3, строка в БД, HTTP 200) с заданным интервалом poke_interval."
    },
    {
      "term": "Mode: poke vs reschedule",
      "definition": "В режиме poke сенсор непрерывно занимает слот воркера и засыпает. В режиме reschedule сенсор завершает задачу, освобождает воркер и планирует повторный запуск через poke_interval секунд."
    },
    {
      "term": "Deferrable Operators (Triggerer)",
      "definition": "Асинхронные операторы нового поколения, передающие ожидание демону Triggerer, полностью освобождая слоты воркеров до момента наступления события."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "airflow_sensor_states",
      "description": "Снимок зависших сенсоров в пуле Celery воркеров",
      "columns": [
        {
          "name": "sensor_id",
          "type": "VARCHAR(64)",
          "keyType": "PK"
        },
        {
          "name": "mode",
          "type": "VARCHAR(16)"
        },
        {
          "name": "worker_slot_held",
          "type": "BOOLEAN"
        },
        {
          "name": "duration_hours",
          "type": "VARCHAR(16)"
        }
      ],
      "sampleRows": [
        {
          "sensor_id": "wait_s3_file_bad",
          "mode": "poke",
          "worker_slot_held": true,
          "duration_hours": "6.5 hours"
        },
        {
          "sensor_id": "wait_s3_file_good",
          "mode": "reschedule",
          "worker_slot_held": false,
          "duration_hours": "0.1 hours"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Сенсоры в Apache Airflow: Как не положить воркеры в ожидании данных\n\nВ дата-инженерии часто нужно ждать готовности данных: «не запускать витрину, пока партнер не загрузит выгрузку `orders_20261101.csv` в S3» или «пока в таблице `raw_logs` не появится 10 000 записей».\n\nДля этого существуют **Сенсоры** (`SqlSensor`, `S3KeySensor`, `HttpSensor`). Но неправильная настройка сенсора способна парализовать весь Airflow-кластер компании!\n\n#### 1. Катастрофа `mode=\"poke\"` (Deadlock воркеров):\n* По умолчанию сенсоры работают в режиме `mode=\"poke\"`.\n* Сенсор выполняет проверку: если данных нет, он делает `time.sleep(60)` **прямо внутри рабочего слота воркера**.\n* Если у вас 16 воркеров и запущено 16 сенсоров, ожидающих ночную выгрузку от банка, **все 16 воркеров заняты сном**! Ни одна другая задача в компании не может запуститься (Queue Deadlock).\n\n#### 2. Спасение: `mode=\"reschedule\"`\n```python\nfrom airflow.providers.common.sql.sensors.sql import SqlSensor\n\nwait_for_data = SqlSensor(\n    task_id=\"wait_for_crm_data\",\n    conn_id=\"postgres_dwh\",\n    sql=\"SELECT COUNT(*) FROM raw_crm WHERE dt = '{{ ds }}';\",\n    mode=\"reschedule\",      # КРИТИЧЕСКИ ВАЖНО: освобождает слот воркера!\n    poke_interval=300,      # проверять раз в 5 минут\n    timeout=3600 * 4,       # упасть по таймауту через 4 часа\n)\n```\nВ режиме `reschedule` сенсор проверяет условие, освобождает воркер (статус `up_for_reschedule`) и уступает место полезным задачам трансформации."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Ожидание столика в ресторане",
      "content": "Режим `poke` — это встать в дверях ресторана и держать дверь руками, не впуская других гостей, пока освобождается ваш столик. Режим `reschedule` — это взять электронный номерок очереди, пойти погулять по парку и вернуться только тогда, когда пейджер завибрирует."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение режимов работы сенсоров Airflow",
        "beforeDescription": "Режим poke (Блокирующий)",
        "beforeColumns": [
          "sensor_behavior",
          "slot_consumption",
          "cluster_impact"
        ],
        "beforeRows": [
          [
            "time.sleep() inside task",
            "Locks 1 worker slot continuously",
            "Deadlock when slots fill up"
          ],
          [
            "Zero useful work done",
            "High idle RAM and CPU cost",
            "Other DAGs blocked in queue"
          ],
          [
            "Long-running wait (hours)",
            "Counts toward task concurrency",
            "Scheduler starving"
          ]
        ],
        "afterDescription": "Режим reschedule / Deferrable",
        "afterColumns": [
          "sensor_behavior",
          "slot_consumption",
          "cluster_impact"
        ],
        "afterRows": [
          [
            "Task exits and reschedules",
            "Frees worker slot immediately",
            "Zero slot starvation"
          ],
          [
            "Other tasks execute",
            "Maximum cluster throughput",
            "All priority jobs run on time"
          ],
          [
            "Triggerer asyncio coroutine",
            "Thousands of waits on 1 core",
            "Optimal hardware utilization"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Сенсор без параметра `timeout`",
      "content": "Партнер перестал присылать файлы. Сенсор без параметра `timeout` остался висеть со статусом `running` навсегда. Через 3 недели в кластере накопилось 120 зависших сенсоров, которые полностью заблокировали выполнение ежедневных отчетов. Всегда задавайте жесткий `timeout=3600*N`!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Чем Deferrable Operators отличаются от сенсоров в режиме `reschedule`?",
      "content": "**Ответ:** `reschedule` каждые N секунд снова берет слот воркера, запускает полноценный процесс Python, проверяет условие и гасит процесс. Deferrable Operators вообще не используют воркеры для повторных проверок: они регистрируют асинхронный триггер в демоне `Triggerer`, который непрерывно проверяет сокет/API через `asyncio` и будит воркер только один раз — когда условие окончательно выполнено."
    }
  ],
  "taskDescription": "Сконфигурируйте безопасный сенсор SqlSensor для ожидания завершения выгрузки в PostgreSQL:\n1. Задайте 'task_id=\"wait_for_partner_data\"'.\n2. Укажите подключение 'conn_id=\"postgres_dwh\"'.\n3. Задайте SQL-запрос проверки: '\"SELECT COUNT(*) FROM raw_orders WHERE order_date = \\'{{ ds }}\\' AND status = \\'READY\\';\"'.\n4. Укажите режим 'mode=\"reschedule\"' для предотвращения блокировки воркеров.\n5. Установите 'poke_interval=60' (проверка каждую минуту) и 'timeout=3600' (таймаут 1 час).\n\nВведите код инициализации сенсора SqlSensor.",
  "seedCode": "from airflow.providers.common.sql.sensors.sql import SqlSensor\n\n# Настройте безопасный SqlSensor в режиме reschedule\nwait_sensor = SqlSensor(\n    task_id=\"wait_for_partner_data\",\n    # укажите параметры\n)",
  "initialCode": "from airflow.providers.common.sql.sensors.sql import SqlSensor\n\nwait_sensor = SqlSensor(\n    task_id=\"wait_for_partner_data\",\n    conn_id=\"postgres_dwh\",\n    sql=\"SELECT COUNT(*) FROM raw_orders WHERE order_date = '{{ ds }}' AND status = 'READY';\",\n    mode=\"reschedule\",\n    poke_interval=60,\n    timeout=3600\n)",
  "solutionCode": "from airflow.providers.common.sql.sensors.sql import SqlSensor\n\nwait_sensor = SqlSensor(\n    task_id=\"wait_for_partner_data\",\n    conn_id=\"postgres_dwh\",\n    sql=\"SELECT COUNT(*) FROM raw_orders WHERE order_date = '{{ ds }}' AND status = 'READY';\",\n    mode=\"reschedule\",\n    poke_interval=60,\n    timeout=3600\n)",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "SqlSensor",
      "wait_for_partner_data",
      "mode=\"reschedule\"",
      "poke_interval=60",
      "timeout=3600"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #804: Зависание всех воркеров Airflow из-за сенсора в режиме poke",
    "incidentDescription": "10 параллельных сенсоров заблокировали 10 слотов воркеров в режиме poke, ожидая файл из внешнего FTP.",
    "buggyCode": "wait_file = FileSensor(task_id='wait_file', filepath='/data/in.csv', mode='poke', poke_interval=10)",
    "fixHint": "Переключите режим сенсора на mode='reschedule' и увеличьте poke_interval.",
    "solutionCode": "wait_file = FileSensor(task_id='wait_file', filepath='/data/in.csv', mode='reschedule', poke_interval=300, timeout=7200)",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Обязательно используйте `mode=\"reschedule\"`, чтобы освобождать ресурсы воркера.",
    "Интервал проверки задается через `poke_interval=60`.",
    "Максимальное время ожидания задается параметром `timeout=3600`."
  ]
};
