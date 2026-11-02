import { Lesson } from '@/types/course';

export const dockerLesson3: Lesson = {
  "id": "docker-3",
  "moduleSlug": "docker",
  "order": 3,
  "title": "Хранение данных и сети в Docker: Volumes, Bind Mounts, сетевые драйверы и изоляция сервисов",
  "estimatedMinutes": 40,
  "glossaryTerms": [
    {
      "term": "Docker Volume (Именованный том)",
      "definition": "Выделенная область в файловой системе хоста (/var/lib/docker/volumes/), управляемая демоном Docker и сохраняющая данные даже после полного удаления контейнера."
    },
    {
      "term": "Bind Mount (Монтирование каталога)",
      "definition": "Прямое пробрасывание конкретной директории или файла с хост-машины внутрь контейнера, идеальное для локальной разработки и изменения кода на лету."
    },
    {
      "term": "Bridge Network (Мостовая сеть)",
      "definition": "Сетевой драйвер Docker по умолчанию, создающий изолированную подсеть и внутренний DNS-сервер для обращения между контейнерами по именам сервисов."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "docker_volumes_registry",
      "description": "Персистентные тома для хранения баз данных и стейта",
      "columns": [
        {
          "name": "volume_name",
          "type": "VARCHAR(64)",
          "keyType": "PK"
        },
        {
          "name": "driver",
          "type": "VARCHAR(16)"
        },
        {
          "name": "target_service",
          "type": "VARCHAR(32)"
        },
        {
          "name": "size_gb",
          "type": "VARCHAR(16)"
        }
      ],
      "sampleRows": [
        {
          "volume_name": "postgres_dw_data",
          "driver": "local",
          "target_service": "postgres",
          "size_gb": "45 GB"
        },
        {
          "volume_name": "minio_s3_storage",
          "driver": "local",
          "target_service": "minio",
          "size_gb": "120 GB"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Персистентность и сетевое взаимодействие в Docker\n\nКонтейнеры по своей природе **эфемерны (stateless)**: если удалить контейнер Postgres без тома, вся база данных бесследно сотрется вместе с его временным слоем. Для сохранения данных в DWH используются два типа хранилища:\n\n#### 1. Named Volumes против Bind Mounts:\n* **Named Volume (`-v pgdata:/var/lib/postgresql/data`):** управляется Docker, изолирован от хоста, имеет максимальную производительность ввода-вывода (I/O). **Стандарт для баз данных (Postgres, ClickHouse, Redis).**\n* **Bind Mount (`-v $(pwd)/dags:/opt/airflow/dags`):** связывает папку на вашем ноутбуке с папкой внутри контейнера. Изменения в Python/SQL файле сразу видны контейнеру без пересборки. **Стандарт для разработки DAG'ов и скриптов.**\n\n#### 2. Сети Docker: Имя контейнера как доменное имя\nНикогда не используйте `localhost` для связи между контейнерами! Внутри контейнера `localhost` означает сам этот контейнер (его собственный `net` namespace).\n* В пользовательской bridge-сети Docker запускает **встроенный DNS-сервер (127.0.0.11)**.\n* Чтобы Python-пайплайн подключился к базе данных, он обращается по имени контейнера:\n  `postgresql://postgres:secret@pg-database:5432/dwh`"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Внешний жесткий диск и внутренняя рация",
      "content": "Docker Volume — это внешний надежный SSD-накопитель, подключенный проводом к серверной стойке: даже если вы выкинете старый сервер на помойку и поставите новый, SSD с данными останется целым. А пользовательская сеть Docker — это внутренняя рация: сотрудникам не нужно знать паспортные данные друг друга, они вызывают коллегу прямо по имени («База, ответь Аналитике»)."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение способов хранения данных в контейнерах",
        "beforeDescription": "Хранение данных во временном слое контейнера (No Volume)",
        "beforeColumns": [
          "event_type",
          "container_lifecycle",
          "data_safety"
        ],
        "beforeRows": [
          [
            "docker stop",
            "Process halts",
            "Data temporarily intact"
          ],
          [
            "docker rm",
            "Container layer destroyed",
            "100% data loss"
          ],
          [
            "Host reboot",
            "Ephemeral layer state",
            "Risk of DB corruption"
          ]
        ],
        "afterDescription": "Использование Named Volume",
        "afterColumns": [
          "event_type",
          "container_lifecycle",
          "data_safety"
        ],
        "afterRows": [
          [
            "docker stop",
            "Process halts",
            "Data safely flushed to disk"
          ],
          [
            "docker rm -f",
            "New container created",
            "Instantly attaches to volume"
          ],
          [
            "Host reboot",
            "Persistent volume intact",
            "Zero data loss"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Обращение по `localhost` из контейнера к контейнеру",
      "content": "Разработчик настроил Airflow с подключением к Postgres `host='localhost'`. Airflow упал с ошибкой `Connection refused`, потому что пытался найти Postgres внутри самого себя! В bridge-сети Docker хостом всегда выступает имя сервиса из compose-файла (`host='postgres'`)."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Чем отличается `docker run --net=host` от пользовательской мостовой сети (user-defined bridge)?",
      "content": "**Ответ:** При `--net=host` контейнер не получает собственного изолированного сетевого пространства имен, а напрямую использует сетевой стек хоста (все порты контейнера открываются на сетевой карте сервера без NAT). Это дает минимальную задержку, но лишает контейнеры изоляции портов и встроенного DNS-резолвинга по именам."
    }
  ],
  "taskDescription": "Вам необходимо развернуть контейнер PostgreSQL в выделенной сети с персистентным томом:\n1. Создайте пользовательскую сеть 'data-net' командой 'docker network create data-net'.\n2. Создайте именованный том 'pg_data' командой 'docker volume create pg_data'.\n3. Запустите контейнер базы с параметрами:\n   - Фоновый режим: '-d'\n   - Имя контейнера: '--name db-warehouse'\n   - Сеть: '--network data-net'\n   - Том: '-v pg_data:/var/lib/postgresql/data'\n   - Переменная пароля: '-e POSTGRES_PASSWORD=analytics'\n   - Образ: 'postgres:16-alpine'\n\nВведите полную команду запуска контейнера PostgreSQL с подключением сети и тома.",
  "seedCode": "#!/bin/bash\n# Запустите Postgres с томом и сетью\n",
  "initialCode": "docker run -d --name db-warehouse --network ... -v ... -e POSTGRES_PASSWORD=analytics postgres:16-alpine",
  "solutionCode": "docker run -d --name db-warehouse --network data-net -v pg_data:/var/lib/postgresql/data -e POSTGRES_PASSWORD=analytics postgres:16-alpine",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "docker run",
      "-d",
      "--name db-warehouse",
      "--network data-net",
      "-v pg_data:/var/lib/postgresql/data",
      "postgres:16-alpine"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #703: Потеря всех таблиц DWH при перезапуске контейнера базы данных",
    "incidentDescription": "Инженер запустил базу данных без монтирования volume. При обновлении версии образа контейнер был удален, и все исторические данные стерлись.",
    "buggyCode": "docker run -d --name pg-dw -e POSTGRES_PASSWORD=secret postgres:16",
    "fixHint": "Обязательно добавьте монтирование тома -v pg_data:/var/lib/postgresql/data.",
    "solutionCode": "docker run -d --name pg-dw -v pg_data:/var/lib/postgresql/data -e POSTGRES_PASSWORD=secret postgres:16",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Используйте флаг `--network data-net` для подключения к созданной сети.",
    "Монтирование тома в стандартную директорию Postgres: `-v pg_data:/var/lib/postgresql/data`.",
    "Полная команда: `docker run -d --name db-warehouse --network data-net -v pg_data:/var/lib/postgresql/data -e POSTGRES_PASSWORD=analytics postgres:16-alpine`."
  ]
};
