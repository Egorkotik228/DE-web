import { Lesson } from '@/types/course';

export const dockerLesson1: Lesson = {
  "id": "docker-1",
  "moduleSlug": "docker",
  "order": 1,
  "title": "Основы контейнеризации: Процессная изоляция (namespaces, cgroups), архитектура Docker и управление контейнерами",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "Linux Namespaces",
      "definition": "Функция ядра Linux, изолирующая системные ресурсы (PID, Network, Mount, IPC, UTS, User) так, что процесс видит только собственное изолированное окружение."
    },
    {
      "term": "Control Groups (cgroups)",
      "definition": "Механизм ядра Linux, позволяющий ограничивать и контролировать потребление ресурсов (CPU, память, диск I/O) группой процессов."
    },
    {
      "term": "OverlayFS / UnionFS",
      "definition": "Каскадная файловая система, объединяющая слои образа (Read-Only) с верхним временным слоем контейнера (Read-Write) по технологии Copy-on-Write."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "docker_containers_inventory",
      "description": "Список запущенных контейнеров локальной среды данных",
      "columns": [
        {
          "name": "container_id",
          "type": "VARCHAR(12)",
          "keyType": "PK"
        },
        {
          "name": "image",
          "type": "VARCHAR(64)"
        },
        {
          "name": "status",
          "type": "VARCHAR(32)"
        },
        {
          "name": "ports",
          "type": "VARCHAR(32)"
        }
      ],
      "sampleRows": [
        {
          "container_id": "a1b2c3d4e5f6",
          "image": "postgres:16-alpine",
          "status": "Up 2 hours",
          "ports": "0.0.0.0:5432->5432/tcp"
        },
        {
          "container_id": "f6e5d4c3b2a1",
          "image": "redis:7-alpine",
          "status": "Up 2 hours",
          "ports": "0.0.0.0:6379->6379/tcp"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Физика контейнеризации Linux: Контейнер — это просто процесс!\n\nЧасто новички путают контейнеры с виртуальными машинами. В контейнерах Docker **нет гостевой операционной системы** и нет гипервизора. Контейнер — это стандартный процесс Linux, запущенный на общем ядре хоста, но изолированный с помощью двух механизмов ядра:\n\n1. **Namespaces (Изоляция пространства имен):**\n   - `pid`: процесс видит себя внутри как PID 1 (родитель всех процессов контейнера).\n   - `net`: отдельный виртуальный сетевой интерфейс (`eth0`), собственный IP и таблица маршрутизации.\n   - `mnt`: изолированная корневая файловая система.\n2. **Cgroups (Лимиты ресурсов):** жесткие рамки по RAM и CPU, предотвращающие захват ресурсов одного сервиса другим.\n\n#### Базовый цикл управления контейнерами:\n```bash\n# Запуск Postgres в фоне с пробросом порта и переменной окружения\ndocker run -d --name pg-dw -p 5432:5432 -e POSTGRES_PASSWORD=secret postgres:16-alpine\n\n# Интерактивное подключение внутрь работающего контейнера\ndocker exec -it pg-dw psql -U postgres\n\n# Просмотр логов и инспекция статуса\ndocker logs -f --tail 100 pg-dw\ndocker stats pg-dw\n```"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Отель с номерами против целого коттеджа",
      "content": "Виртуальная машина (ВМ) — это отдельный загородный коттедж: у него свой фундамент, бойлер и генератор (полная копия ОС, занимающая гигабайты памяти). Контейнер Docker — это номер в гостинице: у постояльца свой ключ и комната (namespace), лимит на полотенца и шум (cgroups), но фундамент, водопровод и электросеть общие (ядро Linux хоста)."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение ВМ и контейнеров для Data Engineering",
        "beforeDescription": "Виртуальные машины (VirtualBox / VMware)",
        "beforeColumns": [
          "metric_name",
          "vm_approach",
          "performance_impact"
        ],
        "beforeRows": [
          [
            "Startup time",
            "1-3 minutes boot time",
            "Slow ad-hoc data testing"
          ],
          [
            "RAM overhead",
            "1-2 GB per OS kernel",
            "Few services fit on laptop"
          ],
          [
            "Image disk size",
            "20-50 GB VDI disk image",
            "Impossible to share in Git"
          ]
        ],
        "afterDescription": "Контейнеры Docker",
        "afterColumns": [
          "metric_name",
          "docker_approach",
          "performance_impact"
        ],
        "afterRows": [
          [
            "Startup time",
            "100-300 milliseconds",
            "Instant automated CI tests"
          ],
          [
            "RAM overhead",
            "< 20 MB container shim",
            "Run 15 services locally"
          ],
          [
            "Image disk size",
            "50-300 MB layered image",
            "Instant pull from registry"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Контейнер без `restart: unless-stopped`",
      "content": "Инженер запустил контейнер базы вручную `docker run -d postgres`. После ночного обновления и перезагрузки хостового сервера контейнер остался выключенным, и утренние пайплайны упали. Всегда используйте флаг `--restart unless-stopped` при ручном запуске или оркестрируйте сервисы через Docker Compose."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Что происходит, когда процесс с PID 1 внутри контейнера завершается?",
      "content": "**Ответ:** Контейнер живет ровно столько, сколько работает его главный процесс (PID 1), указанный в директиве `ENTRYPOINT` или `CMD`. Как только этот процесс завершает свою работу (успешно с кодом 0 или аварийно), Docker немедленно останавливает весь контейнер. Фоновые демоны внутри контейнера без удерживающего PID 1 процесса существовать не могут."
    }
  ],
  "taskDescription": "Вам необходимо запустить изолированный контейнер базы данных ClickHouse для тестирования аналитических витрин:\n1. Имя контейнера должно быть 'ch-analytics'.\n2. Контейнер должен запускаться в фоновом режиме (detached mode, флаг '-d').\n3. Пробросьте порт HTTP-интерфейса '8123:8123'.\n4. Используйте официальный образ 'clickhouse/clickhouse-server:latest'.\n5. Укажите политику перезапуска '--restart unless-stopped'.\n\nВведите команду запуска контейнера ClickHouse с указанными параметрами.",
  "seedCode": "#!/bin/bash\n# Запустите ClickHouse контейнер\n",
  "initialCode": "docker run -d --name ch-analytics -p ... --restart ... clickhouse/clickhouse-server:latest",
  "solutionCode": "docker run -d --name ch-analytics -p 8123:8123 --restart unless-stopped clickhouse/clickhouse-server:latest",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "docker run",
      "-d",
      "--name ch-analytics",
      "-p 8123:8123",
      "--restart unless-stopped",
      "clickhouse/clickhouse-server"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #701: Блокировка терминала при запуске контейнера без detached флага",
    "incidentDescription": "Дата-инженер запустил `docker run postgres` без флага `-d`. Логи заблокировали консоль, а при нажатии Ctrl+C база аварийно отключилась.",
    "buggyCode": "docker run --name pg-prod -p 5432:5432 postgres:16",
    "fixHint": "Добавьте флаг -d для запуска в фоне и --restart unless-stopped для надежности.",
    "solutionCode": "docker run -d --name pg-prod -p 5432:5432 --restart unless-stopped postgres:16",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Используйте команду `docker run -d` для фонового запуска.",
    "Проброс порта выполняется аргументом `-p 8123:8123`.",
    "Полная команда: `docker run -d --name ch-analytics -p 8123:8123 --restart unless-stopped clickhouse/clickhouse-server:latest`."
  ]
};
