import { Lesson } from '@/types/course';

export const dockerLesson2: Lesson = {
  "id": "docker-2",
  "moduleSlug": "docker",
  "order": 2,
  "title": "Создание собственных образов: Анатомия Dockerfile, слои кэширования и multi-stage сборка для Python/DE",
  "estimatedMinutes": 40,
  "glossaryTerms": [
    {
      "term": "Multi-stage build (Многоэтапная сборка)",
      "definition": "Техника сборки Docker-образа с несколькими инструкциями FROM, позволяющая компилировать зависимости в тяжелом образе сборщика и копировать только готовые бинарники в чистый микрообраз."
    },
    {
      "term": "Layer Caching (Кэширование слоев)",
      "definition": "Механизм Docker, при котором неизменившиеся инструкции Dockerfile берутся из локального кэша, ускоряя повторные сборки с минут до миллисекунд."
    },
    {
      "term": ".dockerignore",
      "definition": "Файл исключений, предотвращающий передачу тяжелых или секретных директорий (.git, __pycache__, .venv, .env) в контекст сборки Docker демона."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "docker_image_layers",
      "description": "Слои кастомного Docker-образа пайплайна с размерами",
      "columns": [
        {
          "name": "layer_id",
          "type": "CHAR(12)",
          "keyType": "PK"
        },
        {
          "name": "instruction",
          "type": "VARCHAR(128)"
        },
        {
          "name": "size_mb",
          "type": "VARCHAR(16)"
        }
      ],
      "sampleRows": [
        {
          "layer_id": "4a5b6c7d8e9f",
          "instruction": "FROM python:3.12-slim",
          "size_mb": "130 MB"
        },
        {
          "layer_id": "1a2b3c4d5e6f",
          "instruction": "RUN pip install -r requirements.txt",
          "size_mb": "180 MB"
        },
        {
          "layer_id": "9f8e7d6c5b4a",
          "instruction": "COPY src/ /app/src/",
          "size_mb": "2 MB"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Оптимизация Dockerfile: От гигабайтных монстров к легковесным образам\n\nТипичная ошибка начинающего дата-инженера — собрать образ на базе `FROM python:3.12` и скопировать весь код до установки зависимостей. Результат: образ весит 2 ГБ, а при любом исправлении опечатки в Python-файле `pip install` перекачивает библиотеки заново на 10 минут!\n\n#### 1. Золотое правило порядка слоев (Cache Invalidation)\nDocker инвалидирует кэш слоев сверху вниз. Все, что меняется редко (установка системных пакетов `apt` и `requirements.txt`), должно быть **выше**. Код приложения (`COPY . .`), который меняется постоянно, должен быть **в самом конце**:\n\n```dockerfile\n# ПРАВИЛЬНЫЙ ПОРЯДОК:\nFROM python:3.12-slim\nWORKDIR /app\n\n# 1. Сначала только манифест зависимостей\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\n\n# 2. И только потом часто меняющийся код приложения!\nCOPY . .\nCMD [\"python\", \"etl_main.py\"]\n```\n\n#### 2. Многоэтапная сборка (Multi-stage build)\nДля компиляции C-расширений (psycopg2, PyArrow, orjson) требуются тяжелые пакеты `gcc`, `g++`, `libpq-dev`. Оставлять их в финальном продакшн-образе — риск безопасности и лишний гигабайт веса:\n\n```dockerfile\n# ЭТАП 1: Builder\nFROM python:3.12-slim AS builder\nWORKDIR /app\nRUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev\nCOPY requirements.txt .\nRUN pip install --user --no-cache-dir -r requirements.txt\n\n# ЭТАП 2: Финальный легковесный образ (без GCC!)\nFROM python:3.12-slim\nWORKDIR /app\nRUN apt-get update && apt-get install -y --no-install-recommends libpq5 && rm -rf /var/lib/apt/lists/*\nCOPY --from=builder /root/.local /root/.local\nCOPY . .\nENV PATH=/root/.local/bin:$PATH\nCMD [\"python\", \"etl_main.py\"]\n```"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Строительные леса против готового здания",
      "content": "Multi-stage сборка похожа на строительство небоскреба. Строителям нужны краны, бетономешалки и леса (компилятор GCC и исходники). Но когда жильцы въезжают в готовые квартиры, никто не оставляет строительные леса в коридорах. Финальный образ берет только готовые квартиры, выкидывая стройплощадку на свалку."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение подходов к сборке Python DE образов",
        "beforeDescription": "Наивный монолитный Dockerfile",
        "beforeColumns": [
          "build_metric",
          "naive_dockerfile",
          "impact_on_cluster"
        ],
        "beforeRows": [
          [
            "Image Size",
            "1.8 - 2.5 GB (bloated)",
            "Kubernetes pull timeout"
          ],
          [
            "Build duration",
            "8-12 minutes on every git push",
            "Slow CI/CD cycle"
          ],
          [
            "Security vulnerabilities",
            "Contains GCC, Make, dev headers",
            "Fails Trivy CVE security audit"
          ]
        ],
        "afterDescription": "Оптимизированный Multi-Stage Dockerfile",
        "afterColumns": [
          "build_metric",
          "multi_stage_dockerfile",
          "impact_on_cluster"
        ],
        "afterRows": [
          [
            "Image Size",
            "180 - 240 MB (compact)",
            "Instant node scheduling"
          ],
          [
            "Build duration",
            "5 seconds on cached dependencies",
            "Blazing fast CI/CD feedback"
          ],
          [
            "Security vulnerabilities",
            "Minimal attack surface",
            "100% clean security scan"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Отсутствие `.dockerignore` и утечка `.env`",
      "content": "Инженер выполнил `COPY . /app` без файла `.dockerignore`. В публичный Docker-образ попали локальный файл `.env` с паролями к продакшн-базе и папка `.git` с историей коммитов. Всегда создавайте `.dockerignore` с исключением `.git`, `.env`, `__pycache__` и `.venv`."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Зачем в RUN командах с `apt-get` добавляют `rm -rf /var/lib/apt/lists/*`?",
      "content": "**Ответ:** `apt-get update` скачивает индексы доступных пакетов (около 30-50 МБ). Если не удалить эту директорию в том же самом слое `RUN`, эти временные файлы навсегда запекутся в промежуточный Read-Only слой образа и раздуют итоговый размер, даже если удалить их в следующей инструкции Dockerfile."
    }
  ],
  "taskDescription": "Сформируйте эффективный production-ready Dockerfile для Python ETL-пайплайна:\n1. Базовый образ: 'python:3.12-slim'.\n2. Установите рабочую директорию '/app'.\n3. Скопируйте ТОЛЬКО файл 'requirements.txt'.\n4. Установите зависимости через 'pip install --no-cache-dir -r requirements.txt'.\n5. Скопируйте исходный код проекта ('COPY . .').\n6. Укажите команду по умолчанию для запуска пайплайна: 'CMD [\"python\", \"pipeline.py\"]'.\n\nВведите текст Dockerfile, соблюдающий правильный порядок кэширования слоев.",
  "seedCode": "# Напишите оптимизированный Dockerfile\n",
  "initialCode": "FROM python:3.12-slim\nWORKDIR /app\n\n# Скопируйте сначала requirements.txt для эффективного кэширования\nCOPY ...\nRUN pip install ...\n\n# Затем скопируйте оставшийся код\nCOPY ...\nCMD [...]",
  "solutionCode": "FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nCMD [\"python\", \"pipeline.py\"]",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "FROM python:3.12-slim",
      "WORKDIR /app",
      "COPY requirements.txt",
      "pip install --no-cache-dir",
      "COPY . .",
      "CMD [\"python\", \"pipeline.py\"]"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #702: 15-минутная пересборка Docker при изменении одного символа в скрипте",
    "incidentDescription": "В Dockerfile команда COPY . . стояла ПЕРЕД pip install, из-за чего кэш зависимостей сбрасывался при каждом коммите.",
    "buggyCode": "FROM python:3.12-slim\nWORKDIR /app\nCOPY . .\nRUN pip install -r requirements.txt\nCMD [\"python\", \"app.py\"]",
    "fixHint": "Вынесите COPY requirements.txt и pip install ДО общего копирования файлов проекта.",
    "solutionCode": "FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nCMD [\"python\", \"app.py\"]",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Первой строкой задайте базовый образ: `FROM python:3.12-slim` и `WORKDIR /app`.",
    "Сначала скопируйте `COPY requirements.txt .` и выполните `RUN pip install --no-cache-dir -r requirements.txt`.",
    "В конце скопируйте код: `COPY . .` и задайте команду: `CMD [\"python\", \"pipeline.py\"]`."
  ]
};
