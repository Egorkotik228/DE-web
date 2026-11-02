import { Lesson } from '@/types/course';

export const dockerLesson6: Lesson = {
  "id": "docker-6",
  "moduleSlug": "docker",
  "order": 6,
  "title": "Сборка локального ETL-стека: Проектирование Production-ready docker-compose для Airflow, Postgres, MinIO и Redis",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Local ETL Stack",
      "definition": "Комплексное изолированное окружение дата-инженера на базе Docker Compose, включающее оркестратор (Airflow), СУБД (Postgres), объектное хранилище (MinIO/S3) и брокер сообщений (Redis)."
    },
    {
      "term": "MinIO",
      "definition": "Высокопроизводительное S3-совместимое объектное хранилище с открытым исходным кодом, стандартизированное для локальной разработки Data Lakehouse."
    },
    {
      "term": "YAML Anchors (& and *)",
      "definition": "Синтаксический механизм YAML для повторного использования блоков конфигурации (например, общих переменных окружения и томов для разных компонентов Airflow)."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "etl_stack_services",
      "description": "Компоненты production-ready локального дата-стека",
      "columns": [
        {
          "name": "service",
          "type": "VARCHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "image",
          "type": "VARCHAR(64)"
        },
        {
          "name": "exposed_port",
          "type": "VARCHAR(16)"
        },
        {
          "name": "role",
          "type": "VARCHAR(32)"
        }
      ],
      "sampleRows": [
        {
          "service": "postgres",
          "image": "postgres:16-alpine",
          "exposed_port": "5432",
          "role": "Airflow Metastore & DWH"
        },
        {
          "service": "redis",
          "image": "redis:7-alpine",
          "exposed_port": "6379",
          "role": "Celery Broker"
        },
        {
          "service": "minio",
          "image": "minio/minio:latest",
          "exposed_port": "9000/9001",
          "role": "Local S3 Data Lake"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Архитектура полноценного локального дата-стека\n\nДля тестирования end-to-end дата-пайплайнов (выкачка из API -> сохранение Raw JSON в S3 -> загрузка в DWH -> трансформация через dbt -> оркестрация по расписанию) инженеру необходим полный локальный стенд.\n\n#### Ключевые компоненты стека:\n1. **PostgreSQL (`postgres:16-alpine`):** метастора Airflow + хранилище витрин данных DWH.\n2. **MinIO (`minio/minio`):** локальный эмулятор AWS S3 для сырого слоя (Bronze/Silver/Gold Lakehouse) с UI на порту 9001.\n3. **Redis (`redis:7-alpine`):** кэш и брокер очередей CeleryExecutor для распределенного выполнения тасок Airflow.\n4. **Airflow Webserver & Scheduler (`apache/airflow:2.9.0`):** веб-интерфейс (порт 8080) и планировщик DAG'ов.\n\n#### Повторное использование через YAML Anchors:\nЧтобы не дублировать 20 одинаковых строк переменных окружения и томов в `airflow-webserver` и `airflow-scheduler`, используют якоря YAML:\n```yaml\nx-airflow-common: &airflow-common\n  image: apache/airflow:2.9.0\n  environment:\n    AIRFLOW__CORE__EXECUTOR: CeleryExecutor\n    AIRFLOW__DATABASE__SQL_ALCHEMY_CONN: postgresql+psycopg2://airflow:secret@postgres/airflow\n  volumes:\n    - ./dags:/opt/airflow/dags\n  depends_on:\n    postgres:\n      condition: service_healthy\n\nservices:\n  airflow-webserver:\n    <<: *airflow-common\n    command: webserver\n    ports:\n      - \"8080:8080\"\n```"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Космический тренажер перед полетом на орбиту",
      "content": "Локальный ETL-стек — это авиасимулятор пилота: он в точности воспроизводит облачную инфраструктуру (AWS S3, RDS Postgres, Airflow в Kubernetes), но работает локально на вашем ноутбуке без траты бюджета компании и риска сломать боевую базу."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение сред разработки дата-инженера",
        "beforeDescription": "Тестирование напрямую в боевом облаке (AWS/GCP)",
        "beforeColumns": [
          "development_factor",
          "cloud_testing",
          "developer_experience"
        ],
        "beforeRows": [
          [
            "Cost overhead",
            "$$$ AWS bills for dev clusters",
            "Financial budget waste"
          ],
          [
            "Feedback loop",
            "10-20 min upload and wait",
            "Painfully slow debugging"
          ],
          [
            "Blast radius",
            "Accidental drop table in prod",
            "Catastrophic business risk"
          ]
        ],
        "afterDescription": "Локальный стек в Docker Compose (Postgres + MinIO + Airflow)",
        "afterColumns": [
          "development_factor",
          "cloud_testing",
          "developer_experience"
        ],
        "afterRows": [
          [
            "Cost overhead",
            "$0 on local laptop",
            "Zero cloud spend"
          ],
          [
            "Feedback loop",
            "1 second reload of DAG",
            "Blazing fast feedback"
          ],
          [
            "Blast radius",
            "Completely isolated sandbox",
            "100% safe experimentation"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Проброс порта 5432 на `0.0.0.0` без пароля",
      "content": "Инженер указал `ports: - \"5432:5432\"` на удаленном сервере без фаервола. Роботы-сканеры интернета через 3 минуты нашли открытый порт Postgres и зашифровали базу вирусом-вымогателем. Если сервис нужен только внутри сети Compose, **не пробрасывайте ports наружу вообще**, либо биндите строго на локалхост: `\"127.0.0.1:5432:5432\"`."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Зачем в production-ready Compose стеке для MinIO указывают два порта (9000 и 9001)?",
      "content": "**Ответ:** Порт 9000 — это S3 API эндпоинт, к которому обращаются Spark, boto3 и клиенты хранилища по протоколу AWS S3 REST API. Порт 9001 — это графический веб-интерфейс MinIO Console для визуального просмотра бакетов, файлов и управления правами доступа пользователей."
    }
  ],
  "taskDescription": "Спроектируйте конфигурацию сервиса объектного хранилища MinIO (локального S3 Data Lake) в файле docker-compose.yml:\n1. Сервис называется 'minio'.\n2. Использует образ 'minio/minio:latest'.\n3. Команда запуска: 'server /data --console-address \":9001\"'.\n4. Пробросьте оба порта наружу: '\"9000:9000\"' (S3 API) и '\"9001:9001\"' (Web Console).\n5. Задайте учетные данные root пользователя через переменные окружения: MINIO_ROOT_USER: 'minioadmin' и MINIO_ROOT_PASSWORD: 'miniopassword'.\n6. Подключите персистентный том 'minio_data:/data'.\n\nВведите фрагмент docker-compose.yml для сервиса minio.",
  "seedCode": "# Напишите конфигурацию сервиса minio для локального S3 Data Lake\n",
  "initialCode": "  minio:\n    image: minio/minio:latest\n    command: ...\n    ports:\n      - \"9000:9000\"\n      - \"9001:9001\"\n    environment:\n      MINIO_ROOT_USER: ...\n      MINIO_ROOT_PASSWORD: ...\n    volumes:\n      - ...",
  "solutionCode": "  minio:\n    image: minio/minio:latest\n    command: server /data --console-address \":9001\"\n    ports:\n      - \"9000:9000\"\n      - \"9001:9001\"\n    environment:\n      MINIO_ROOT_USER: minioadmin\n      MINIO_ROOT_PASSWORD: miniopassword\n    volumes:\n      - minio_data:/data",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "minio:",
      "image: minio/minio",
      "server /data --console-address \":9001\"",
      "\"9000:9000\"",
      "\"9001:9001\"",
      "MINIO_ROOT_USER: minioadmin",
      "minio_data:/data"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #706: Открытие сырого S3 Data Lake всему интернету",
    "incidentDescription": "Порт консоли MinIO был опубликован на 0.0.0.0 со стандартным паролем minioadmin, что привело к публичной утечке данных.",
    "buggyCode": "ports:\n  - \"9001:9001\"\nenvironment:\n  MINIO_ROOT_PASSWORD: minioadmin",
    "fixHint": "Привяжите порт к 127.0.0.1 или измените стандартный пароль на сложный секрет.",
    "solutionCode": "ports:\n  - \"127.0.0.1:9001:9001\"\nenvironment:\n  MINIO_ROOT_PASSWORD: ${MINIO_SECURE_PASSWORD:?Error: Password required}",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Команда запуска MinIO: `command: server /data --console-address \":9001\"`.",
    "Пробросьте оба порта: `- \"9000:9000\"` и `- \"9001:9001\"`.",
    "Подключите персистентный том: `- minio_data:/data`."
  ]
};
