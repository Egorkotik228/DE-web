import { Lesson } from '@/types/course';

export const linuxGitLesson6: Lesson = {
  "id": "linux-git-6",
  "moduleSlug": "linux-git",
  "order": 6,
  "title": "CI/CD основы для Data Engineer: автоматический запуск тестов, линтеров и миграций",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "CI/CD (Continuous Integration / Continuous Delivery)",
      "definition": "Практика автоматического тестирования, сборки и доставки изменений кода в хранилище данных при каждом push или открытии Pull Request."
    },
    {
      "term": "SQLFluff",
      "definition": "Популярный диалектно-осведомленный линтер и автоформаттер SQL-запросов и dbt-моделей для поддержания единого стиля кода в дата-команде."
    },
    {
      "term": "Ephemeral Staging Environment",
      "definition": "Временная изолированная схема БД или контейнер, поднимаемый в CI-пайплайне для прогона тестов миграций и автоматически уничтожаемый после завершения."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "ci_pipeline_runs",
      "description": "Журнал прогона автоматических проверок в GitHub Actions / GitLab CI",
      "columns": [
        {
          "name": "run_id",
          "type": "INTEGER",
          "keyType": "PK"
        },
        {
          "name": "commit_sha",
          "type": "CHAR(40)",
          
        },
        {
          "name": "stage_name",
          "type": "VARCHAR(32)",
          
        },
        {
          "name": "status",
          "type": "VARCHAR(16)",
          
        }
      ],
      "sampleRows": [
        {
          "run_id": 8401,
          "commit_sha": "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
          "stage_name": "lint-sql",
          "status": "PASSED"
        },
        {
          "run_id": 8402,
          "commit_sha": "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
          "stage_name": "dbt-test",
          "status": "PASSED"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Непрерывная интеграция и доставка (CI/CD) в Data Engineering\n\nЭра «заливки скриптов на прод руками по SSH» ушла в прошлое. Любое изменение в DWH (добавление колонки, изменение dbt-модели, новый DAG Airflow) обязано проходить автоматические проверки в изолированном CI/CD раннере.\n\n#### 1. Стадии классического Data CI пайплайна:\n1. **Linting & Formatting:**\n   - Проверка Python: `ruff check .` и `mypy`.\n   - Проверка SQL: `sqlfluff lint models/ --dialect postgres`.\n2. **Unit & Integrity Tests:**\n   - `pytest tests/` (проверка логики парсеров и бизнес-расчетов).\n   - `dbt compile` (проверка валидности Jinja-шаблонов и графа DAG без подключения к базе).\n3. **Ephemeral Integration Tests (Тест миграций):**\n   - В CI поднимается тестовый Postgres/ClickHouse в Docker.\n   - Накатываются миграции: `flyway migrate` или `dbt build --select state:modified`.\n4. **CD (Continuous Deployment):**\n   - При мерже в `main` обновленный код автоматически синкается в production S3 бакет DAG'ов Airflow или деплоится через Helm/K8s.\n\n#### 2. Пример GitHub Actions Workflow (.github/workflows/ci.yml):\n```yaml\nname: Data Pipeline CI\non: [pull_request]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-python@v5\n        with: { python-version: '3.11' }\n      - run: pip install ruff sqlfluff pytest\n      - run: ruff check .\n      - run: sqlfluff lint models/\n      - run: pytest tests/\n```"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Таможенный контроль на границе",
      "content": "CI/CD пайплайн — это автоматический таможенный досмотр: перед тем как пустить груз (ваш коммит) в страну (продакшн DWH), рентген проверяет документы (линтер SQLFluff), служебная собака ищет контрабанду (тесты pytest), и только после зеленого штампа шлагбаум открывается автоматически."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение процессов релиза в хранилище данных",
        "beforeDescription": "Ручной деплой инженером по пятницам",
        "beforeColumns": [
          "release_step",
          "human_error_factor",
          "time_to_detect_bug"
        ],
        "beforeRows": [
          [
            "Apply migration manually",
            "Forgot WHERE clause in DDL",
            "Found in production on Monday"
          ],
          [
            "Copy DAG file via SCP",
            "Syntax error in Airflow file",
            "Scheduler crashes completely"
          ],
          [
            "Unformatted SQL style",
            "Every engineer writes differently",
            "Impossible code review"
          ]
        ],
        "afterDescription": "Автоматизированный CI/CD пайплайн",
        "afterColumns": [
          "release_step",
          "human_error_factor",
          "time_to_detect_bug"
        ],
        "afterRows": [
          [
            "Automated CI migration run",
            "Zero manual DB credentials",
            "Found in CI PR in 2 minutes"
          ],
          [
            "GitOps auto-sync to prod",
            "Validated by pre-commit hooks",
            "Broken DAG blocked from deploy"
          ],
          [
            "Enforced SQLFluff rules",
            "100% unified code standard",
            "Fast painless code review"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Хардкод секретов и паролей в файле workflow",
      "content": "Инженер прописал `POSTGRES_PASSWORD: my_secret_pass` прямо в `.github/workflows/deploy.yml`. Публичный или корпоративный репозиторий утек, и злоумышленники получили доступ к персональным данным клиентов. Все секреты обязаны храниться в `GitHub Secrets` или `HashiCorp Vault` и внедряться через переменные окружения `${{ secrets.DB_PASS }}`."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Что такое Slim CI в dbt и как он экономит время сборки?",
      "content": "**Ответ:** Slim CI в dbt использует артефакт `manifest.json` из последнего успешного продакшн-запуска для вычисления разницы (state comparison). Вместо пересборки сотен моделей хранилища CI запускает только команду `dbt test --select state:modified+`, проверяя исключительно измененные модели и их прямых потомков, сокращая время тестирования с 1 часа до 2 минут."
    }
  ],
  "taskDescription": "Вам необходимо составить базовый шаг GitHub Actions для запуска линтера SQLFluff и тестов pytest:\n1. Запустите проверку стиля SQL-запросов в папке 'models/' с помощью 'sqlfluff lint models/'.\n2. Запустите автоматические модульные тесты дата-пайплайнов с помощью утилиты 'pytest tests/'.\n3. Сформируйте объединенную команду для шага CI, которая сначала запускает линтер, и при его успешном прохождении запускает тесты: 'sqlfluff lint models/ && pytest tests/'.\n\nВведите команду для запуска линтера SQL и последующего запуска pytest.",
  "seedCode": "#!/bin/bash\n# Запустите проверки CI\n",
  "initialCode": "sqlfluff ... && pytest ...",
  "solutionCode": "sqlfluff lint models/ && pytest tests/",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "sqlfluff lint models/",
      "pytest tests/"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #606: Деплой сломанного DAG в прод из-за отсутствия CI",
    "incidentDescription": "Инженер сделал опечатку в синтаксисе Python в файле DAG, и Airflow Scheduler упал в циклический рестарт.",
    "buggyCode": "git push origin main # прямо в прод без тестов",
    "fixHint": "Настройте обязательный шаг валидации python -m py_compile dags/*.py в pull_request workflow.",
    "solutionCode": "python -m py_compile dags/*.py && pytest tests/",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Команда для проверки SQL: `sqlfluff lint models/`.",
    "Команда для запуска модульных тестов: `pytest tests/`.",
    "Объедините их через логическое И: `sqlfluff lint models/ && pytest tests/`."
  ]
};
