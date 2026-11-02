import { Lesson } from '@/types/course';

export const dockerLesson4: Lesson = {
  "id": "docker-4",
  "moduleSlug": "docker",
  "order": 4,
  "title": "Docker Compose для DE: Декларативное описание инфраструктуры, зависимости и healthchecks",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Docker Compose",
      "definition": "Инструмент для декларативного определения и запуска многоконтейнерных приложений с помощью единого конфигурационного файла docker-compose.yml."
    },
    {
      "term": "Healthcheck",
      "definition": "Инструкция в Docker Compose или Dockerfile, периодически выполняющая команду проверки реальной готовности сервиса принимать запросы (например, pg_isready)."
    },
    {
      "term": "depends_on (condition: service_healthy)",
      "definition": "Конструкция Compose, блокирующая старт зависимого сервиса (например, Airflow) до тех пор, пока база данных не пройдет все проверки healthcheck."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "compose_services_topology",
      "description": "Топология сервисов дата-стека в docker-compose",
      "columns": [
        {
          "name": "service_name",
          "type": "VARCHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "image",
          "type": "VARCHAR(64)"
        },
        {
          "name": "depends_on",
          "type": "VARCHAR(64)"
        },
        {
          "name": "health_status",
          "type": "VARCHAR(16)"
        }
      ],
      "sampleRows": [
        {
          "service_name": "postgres",
          "image": "postgres:16-alpine",
          "depends_on": "none",
          "health_status": "healthy"
        },
        {
          "service_name": "airflow-init",
          "image": "apache/airflow:2.9.0",
          "depends_on": "postgres (healthy)",
          "health_status": "completed"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Оркестрация локального окружения с Docker Compose\n\nПоднимать 5 сервисов дата-стека (Postgres, MinIO, Redis, Airflow Webserver, Airflow Scheduler) отдельными командами `docker run` в терминале — гарантия ошибок. Docker Compose описывает всю инфраструктуру как код (IaC) в одном файле `docker-compose.yml`.\n\n#### 1. Проблема наивного `depends_on` (Race Condition)\nЕсли написать:\n```yaml\nservices:\n  airflow-webserver:\n    image: apache/airflow:2.9.0\n    depends_on:\n      - postgres\n```\nDocker запустит контейнер Postgres и **в ту же миллисекунду** начнет запускать Airflow. Но процессу Postgres нужно 5-10 секунд для инициализации системных каталогов. Airflow не сможет подключиться и упадет в перезапуск!\n\n#### 2. Решение: Healthcheck + `condition: service_healthy`\nПравильный паттерн гарантирует, что Airflow стартует только тогда, когда Postgres реально готов принимать соединения:\n\n```yaml\nservices:\n  postgres:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_DB: airflow\n      POSTGRES_PASSWORD: secret\n    healthcheck:\n      test: [\"CMD-SHELL\", \"pg_isready -U postgres -d airflow\"]\n      interval: 5s\n      timeout: 5s\n      retries: 5\n\n  airflow-scheduler:\n    image: apache/airflow:2.9.0\n    depends_on:\n      postgres:\n        condition: service_healthy\n```"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Посадка пассажиров в самолет",
      "content": "Наивный `depends_on` — это запустить пассажиров в самолет в тот момент, когда пилоты только подошли к трапу: трап еще не закреплен, двигатели не запущены, начнется паника. `condition: service_healthy` — это четкий сигнал стюардессы: самолет заправлен, бортовые системы проверены, посадка разрешена."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение методов синхронизации запуска сервисов",
        "beforeDescription": "Базовый depends_on без healthcheck",
        "beforeColumns": [
          "launch_event",
          "dependency_status",
          "failure_risk"
        ],
        "beforeRows": [
          [
            "Compose starts services",
            "Postgres container created",
            "Airflow throws crash loop"
          ],
          [
            "DB initializing schema",
            "Port open but not ready",
            "Deadlock on migrations"
          ],
          [
            "Restart loop",
            "Services restart 10 times",
            "Frustrated developer"
          ]
        ],
        "afterDescription": "Синхронизация через condition: service_healthy",
        "afterColumns": [
          "launch_event",
          "dependency_status",
          "failure_risk"
        ],
        "afterRows": [
          [
            "Compose starts Postgres",
            "Executes pg_isready",
            "Airflow remains paused"
          ],
          [
            "Postgres reports healthy",
            "Port fully operational",
            "Airflow boots smoothly"
          ],
          [
            "One-command start",
            "docker compose up -d",
            "100% deterministic boot"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: `restart: always` на падающем контейнере миграций",
      "content": "Для контейнера `airflow-init` (выполняющего `airflow db migrate`) указали `restart: always`. Когда в SQL-миграции произошла ошибка, контейнер упал, перезапустился и начал выполнять сломанную миграцию по кругу каждые 3 секунды, заблокировав системные таблицы Postgres. Для одноразовых задач миграции перезапуск должен быть `restart: \"no\"` или `restart: on-failure`."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: В чем разница между `docker compose stop` и `docker compose down`?",
      "content": "**Ответ:** `docker compose stop` только останавливает запущенные контейнеры сервисов, сохраняя сами контейнеры, их внутреннее состояние и созданные сети. Команда `docker compose down` останавливает и полностью удаляет контейнеры и пользовательские сети (а при указании флага `-v` удаляет еще и персистентные volumes)."
    }
  ],
  "taskDescription": "Сформируйте конфигурационный блок Docker Compose для сервиса аналитики 'dbt-runner', зависящего от базы данных 'warehouse':\n1. Сервис 'dbt-runner' использует образ 'ghcr.io/dbt-labs/dbt-postgres:1.7.0'.\n2. Сервис должен запускаться только после того, как база 'warehouse' перейдет в состояние 'healthy' с помощью конструкции 'depends_on' и 'condition: service_healthy'.\n3. Примонтируйте текущую директорию в контейнер через bind mount: './dbt_project:/usr/app'.\n\nВведите фрагмент docker-compose.yml для сервиса dbt-runner.",
  "seedCode": "# Напишите конфигурацию сервиса dbt-runner\n",
  "initialCode": "  dbt-runner:\n    image: ghcr.io/dbt-labs/dbt-postgres:1.7.0\n    depends_on:\n      warehouse:\n        condition: ...\n    volumes:\n      - ...",
  "solutionCode": "  dbt-runner:\n    image: ghcr.io/dbt-labs/dbt-postgres:1.7.0\n    depends_on:\n      warehouse:\n        condition: service_healthy\n    volumes:\n      - ./dbt_project:/usr/app",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "dbt-runner:",
      "image: ghcr.io/dbt-labs/dbt-postgres",
      "warehouse:",
      "condition: service_healthy",
      "./dbt_project:/usr/app"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #704: Бесконечный цикл падения Airflow при старте до готовности базы",
    "incidentDescription": "Airflow упал при старте с ошибкой 'could not connect to server: Connection refused', потому что Postgres еще не завершил initdb.",
    "buggyCode": "services:\n  airflow:\n    image: apache/airflow:2.9.0\n    depends_on:\n      - postgres",
    "fixHint": "Добавьте проверку healthcheck для postgres и condition: service_healthy в depends_on.",
    "solutionCode": "services:\n  airflow:\n    image: apache/airflow:2.9.0\n    depends_on:\n      postgres:\n        condition: service_healthy",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Для ожидания реальной готовности базы используйте `condition: service_healthy` внутри `depends_on`.",
    "Монтирование локальной папки проекта: `./dbt_project:/usr/app` в секции `volumes`.",
    "Соблюдайте отступы YAML (2 или 4 пробела)."
  ]
};
