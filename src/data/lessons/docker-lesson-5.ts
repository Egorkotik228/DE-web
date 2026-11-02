import { Lesson } from '@/types/course';

export const dockerLesson5: Lesson = {
  "id": "docker-5",
  "moduleSlug": "docker",
  "order": 5,
  "title": "Ресурсы и безопасность: Лимиты памяти и CPU, предотвращение OOM Killer и запуск non-root (USER)",
  "estimatedMinutes": 40,
  "glossaryTerms": [
    {
      "term": "Exit Code 137 (128 + 9 SIGKILL)",
      "definition": "Код аварийного завершения контейнера в Linux/Docker, однозначно указывающий на то, что процесс был принудительно убит ядром по причине превышения лимита памяти (OOM Killer)."
    },
    {
      "term": "Memory Reservation vs Limit (soft/hard)",
      "definition": "Reservation (soft limit) резервирует гарантированный объем RAM для контейнера, а Limit (hard limit) задает жесткий потолок, при превышении которого срабатывает OOM."
    },
    {
      "term": "Non-root User (Директива USER)",
      "definition": "Правило безопасности Dockerfile, требующее запуска процессов внутри контейнера под непривилегированным пользователем (UID != 0) для защиты хоста при возможном взломе."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "container_resource_limits",
      "description": "Спецификация лимитов ресурсов cgroups для ETL-сервисов",
      "columns": [
        {
          "name": "service_name",
          "type": "VARCHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "cpu_limit",
          "type": "VARCHAR(8)"
        },
        {
          "name": "memory_limit",
          "type": "VARCHAR(16)"
        },
        {
          "name": "run_as_user",
          "type": "VARCHAR(16)"
        }
      ],
      "sampleRows": [
        {
          "service_name": "spark-worker",
          "cpu_limit": "2.0",
          "memory_limit": "4096M",
          "run_as_user": "spark (1000)"
        },
        {
          "service_name": "postgres-dwh",
          "cpu_limit": "4.0",
          "memory_limit": "8192M",
          "run_as_user": "postgres (999)"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Управление ресурсами и безопасность контейнеров в дата-инженерии\n\nДата-пайплайны (Pandas, PySpark, Polars, dbt) крайне прожорливы к оперативной памяти. Если запустить тяжелый джоб в контейнере без ограничений cgroups, один скрипт может сожрать все 64 ГБ RAM хоста, вызвав падение всей операционной системы сервера!\n\n#### 1. Ограничение ресурсов в Docker Compose (deploy.resources)\nВ современных версиях Compose лимиты задаются через блок `deploy.resources`:\n```yaml\nservices:\n  data-processor:\n    image: my-etl:latest\n    deploy:\n      resources:\n        limits:\n          cpus: '2.0'\n          memory: 4096M\n        reservations:\n          cpus: '0.5'\n          memory: 1024M\n```\nЕсли процесс внутри превысит 4096 МБ RAM, ядро мгновенно пришлет `SIGKILL` (Exit Code 137). Это защитит остальные сервисы на сервере от каскадного падения.\n\n#### 2. Безопасность: Принцип наименьших привилегий (USER non-root)\nПо умолчанию все процессы внутри контейнера работают под пользователем `root` (UID 0). Если в вашей Python-библиотеке или Airflow есть уязвимость (CVE), злоумышленник получит права root на хостовой машине через volume mounts или container escape!\n\n```dockerfile\nFROM python:3.12-slim\n# 1. Создаем пользователя без прав root\nRUN groupadd -g 1000 dataeng && useradd -u 1000 -g dataeng -s /bin/bash -m dataeng\nWORKDIR /home/dataeng/app\nCOPY --chown=dataeng:dataeng . .\n# 2. Переключаемся на непривилегированного пользователя!\nUSER dataeng\nCMD [\"python\", \"worker.py\"]\n```"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Предохранитель в электрощитке и гостевой бейдж",
      "content": "Лимит памяти `memory: 4G` — это автоматический предохранитель в щитке: если стиральная машина закоротила (скрипт начал бесконечно раздувать датафрейм), предохранитель отключит только одну розетку, а не сожжет проводку во всем жилом доме. А директива `USER` — это гостевой бейдж: посетитель офиса не может зайти в кабинет директора или открыть сейф компании."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение безопасности и стабильности контейнеров",
        "beforeDescription": "Запуск от root без ограничений памяти",
        "beforeColumns": [
          "security_aspect",
          "memory_exhaustion",
          "host_stability"
        ],
        "beforeRows": [
          [
            "Runs as UID 0 (root)",
            "Consumes 100% host RAM",
            "Host Linux freezes completely"
          ],
          [
            "File permissions root:root",
            "Database services starve",
            "SSH access lost"
          ],
          [
            "Security audit fails",
            "Random processes killed",
            "Unpredictable downtime"
          ]
        ],
        "afterDescription": "Запуск с лимитами cgroups и non-root USER",
        "afterColumns": [
          "security_aspect",
          "memory_exhaustion",
          "host_stability"
        ],
        "afterRows": [
          [
            "Runs as UID 1000 (dataeng)",
            "Isolated OOM 137 on task",
            "Host OS perfectly stable"
          ],
          [
            "File permissions protected",
            "Reserved RAM for database",
            "SSH remains accessible"
          ],
          [
            "Compliant with CIS benchmarks",
            "Clear OOM alert in logs",
            "Predictable SLA recovery"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Файлы root:root на смонтированных томах",
      "content": "Скрипт внутри контейнера, запущенный от `root`, записал логи в bind mount `./logs/`. Теперь на хостовой машине обычный разработчик не может ни удалить, ни отредактировать эти файлы без `sudo rm -rf`. Всегда запускайте контейнер с флагом `--user $(id -u):$(id -g)` или директивой `USER` в Dockerfile."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Что означает Exit Code 137 у контейнера Docker?",
      "content": "**Ответ:** Код 137 формируется по правилу: 128 + номер сигнала. Сигнал 9 — это SIGKILL (`128 + 9 = 137`). В подавляющем большинстве случаев это означает, что контейнер превысил лимит памяти `memory.limit_in_bytes` и был принудительно уничтожен механизмом OOM Killer операционной системы."
    }
  ],
  "taskDescription": "Сформируйте блок Docker Compose для сервиса тяжелой обработки данных 'spark-driver':\n1. Сервис использует образ 'apache/spark-py:v3.5.0'.\n2. Ограничьте максимальное потребление ресурсов через блок 'deploy.resources.limits':\n   - Ограничение CPU: 'cpus: \"2.0\"'\n   - Ограничение памяти: 'memory: 4096M'\n3. Запустите контейнер под непривилегированным пользователем 'user: \"1000:1000\"'.\n\nВведите фрагмент docker-compose.yml для сервиса spark-driver.",
  "seedCode": "# Напишите конфигурацию spark-driver с лимитами ресурсов\n",
  "initialCode": "  spark-driver:\n    image: apache/spark-py:v3.5.0\n    user: \"...\"\n    deploy:\n      resources:\n        limits:\n          cpus: \"...\"\n          memory: ...",
  "solutionCode": "  spark-driver:\n    image: apache/spark-py:v3.5.0\n    user: \"1000:1000\"\n    deploy:\n      resources:\n        limits:\n          cpus: \"2.0\"\n          memory: 4096M",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "spark-driver:",
      "image: apache/spark-py",
      "user: \"1000:1000\"",
      "deploy:",
      "resources:",
      "limits:",
      "cpus: \"2.0\"",
      "memory: 4096M"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #705: Падение боевого сервера из-за бесконечного аппетита Pandas",
    "incidentDescription": "ETL-скрипт прочитал 30 ГБ CSV-файл в память без лимита cgroups, уронив сервер базы данных.",
    "buggyCode": "services:\n  etl-job:\n    image: python-etl:latest # без лимитов ресурсов",
    "fixHint": "Добавьте блок deploy.resources.limits с жестким ограничением memory: 4096M.",
    "solutionCode": "services:\n  etl-job:\n    image: python-etl:latest\n    deploy:\n      resources:\n        limits:\n          memory: 4096M",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Укажите директиву `user: \"1000:1000\"` для запуска без прав root.",
    "В секции `deploy.resources.limits` задайте `cpus: \"2.0\"` и `memory: 4096M`.",
    "Соблюдайте корректные уровни вложенности в YAML."
  ]
};
