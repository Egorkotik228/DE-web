import { Lesson } from '@/types/course';

export const airflowLesson8: Lesson = {
  "id": "airflow-8",
  "moduleSlug": "airflow",
  "order": 8,
  "title": "Production Best Practices: Динамическая генерация DAG, тестирование синтаксиса и Secrets Backend",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Dynamic DAG Generation",
      "definition": "Паттерн автоматического создания множества аналогичных DAG на основе внешних файлов конфигурации (YAML / JSON) без дублирования кода."
    },
    {
      "term": "DAG Parsing Test (pytest)",
      "definition": "Автоматизированный юнит-тест в CI/CD, проверяющий валидность синтаксиса, отсутствие циклических зависимостей и импортов во всех DAG-файлах репозитория."
    },
    {
      "term": "Secrets Backend (HashiCorp Vault / AWS SSM)",
      "definition": "Интеграция Airflow со сторонними защищенными хранилищами секретов, исключающая хранение паролей и токенов в метабазе или коде."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "airflow_secrets_backend_mapping",
      "description": "Связка переменных и коннектов с внешним хранилищем секретов",
      "columns": [
        {
          "name": "connection_id",
          "type": "VARCHAR(64)",
          "keyType": "PK"
        },
        {
          "name": "backend_path",
          "type": "VARCHAR(128)"
        },
        {
          "name": "vault_engine",
          "type": "VARCHAR(32)"
        }
      ],
      "sampleRows": [
        {
          "connection_id": "postgres_dw",
          "backend_path": "secret/airflow/connections/postgres_dw",
          "vault_engine": "hashicorp_vault"
        },
        {
          "connection_id": "s3_lakehouse",
          "backend_path": "secret/airflow/connections/s3_lakehouse",
          "vault_engine": "aws_ssm"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Промышленные стандарты разработки Apache Airflow\n\nКогда дата-платформа вырастает до 500+ DAG'ов, ручное написание каждого графа превращается в кошмар сопровождения. Зрелая инженерная культура строится на трех столпах:\n\n#### 1. Автоматическое тестирование DAG в CI/CD (DAG Parsing Test):\nНи один коммит не должен попадать в продакшн без проверки на синтаксические ошибки и циклы. Простой тест на `pytest` предотвращает падение планировщика:\n```python\nimport pytest\nfrom airflow.models import DagBag\n\ndef test_dag_bag_import():\n    dagbag = DagBag(dag_folder=\"dags/\", include_examples=False)\n    # Проверяем, что нет ошибок импорта\n    assert len(dagbag.import_errors) == 0, f\"DAG import errors: {dagbag.import_errors}\"\n    # Проверяем наличие тегов и владельца у каждого DAG\n    for dag_id, dag in dagbag.dags.items():\n        assert dag.tags, f\"DAG {dag_id} must have tags!\"\n```\n\n#### 2. Динамическая генерация DAG из конфигурации:\nВместо копипасты 50 однотипных DAG'ов для репликации таблиц из MySQL в ClickHouse создается YAML-конфиг (`tables.yaml`), а фабрика DAG (`dag_factory.py`) на лету регистрирует графы в глобальной таблице символов `globals()[dag_id] = create_dag(...)`.\n\n#### 3. Безопасность: Внешний Secrets Backend\nНикогда не храните пароли в коде или в UI Airflow в виде открытых Variables! Используйте **Secrets Backend** (HashiCorp Vault / AWS Secrets Manager). При обращении `BaseHook.get_connection(\"pg_conn\")` Airflow на лету безопасно запрашивает секрет из Vault."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Формочки для выпечки и банковская ячейка",
      "content": "Динамическая генерация DAG — это формочки для печенья: вы заливаете разную глазурь (YAML-конфиги таблиц), а форма выпекает 100 идеальных одинаковых пряников без ручной лепки каждого. А Secrets Backend — это банковская ячейка: пароли хранятся не на стикере под клавиатурой, а в бронированном хранилище банка."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение подходов к управлению большим парком DAG",
        "beforeDescription": "Ручное создание и отсутствие тестов",
        "beforeColumns": [
          "engineering_process",
          "dag_scalability",
          "incident_frequency"
        ],
        "beforeRows": [
          [
            "50 identical copy-paste files",
            "100 hours to update connection",
            "Typos crash scheduler in prod"
          ],
          [
            "No pytest validation in CI",
            "Broken DAG deployed to master",
            "Nightly orchestration halted"
          ],
          [
            "Passwords in git repo .py files",
            "Leaked credentials in commit log",
            "Critical security breach"
          ]
        ],
        "afterDescription": "Config-driven DAGs + CI/CD + Secrets Backend",
        "afterColumns": [
          "engineering_process",
          "dag_scalability",
          "incident_frequency"
        ],
        "afterRows": [
          [
            "Dynamic generation from YAML",
            "5 seconds to add 20 new tables",
            "100% unified code quality"
          ],
          [
            "Automated DagBag import test",
            "Catches errors before git merge",
            "Zero broken DAGs in production"
          ],
          [
            "HashiCorp Vault integration",
            "Dynamic short-lived credentials",
            "Bank-grade enterprise security"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Динамический DAG со случайным `dag_id` или циклом в globals()",
      "content": "Инженер сгенерировал DAG с `dag_id = f'sync_{datetime.now()}'`. При каждом проходе парсера (каждые 30 сек) Scheduler создавал абсолютно новый DAG и забивал метабазу миллионами записей-призраков. Идентификатор `dag_id` обязан быть строго детерминированным и постоянным!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Как протестировать, что в графе задач Airflow нет циклических зависимостей (Cyclic Dependency)?",
      "content": "**Ответ:** При загрузке через `DagBag(dag_folder=\"...\")` Airflow автоматически выполняет проверку на ацикличность графа (алгоритм топологической сортировки Кана / Тарьяна). Если в графе есть цикл (A >> B >> C >> A), Airflow выбрасывает исключение `AirflowDagCycleException`, которое сразу ловится проверкой `assert len(dagbag.import_errors) == 0` в CI-тесте."
    }
  ],
  "taskDescription": "Напишите обязательный тест на pytest для проверки отсутствия ошибок импорта во всех DAG репозитория:\n1. Импортируйте 'pytest' и класс 'DagBag' из 'airflow.models'.\n2. Создайте тестовую функцию 'test_dags_import_errors():'.\n3. Инициализируйте объект 'dagbag = DagBag(dag_folder=\"dags/\", include_examples=False)'.\n4. Проверьте утверждение 'assert len(dagbag.import_errors) == 0' с информативным сообщением об ошибке: `f\"DAG import errors: {dagbag.import_errors}\"`.\n\nВведите полный код функции тестирования на pytest.",
  "seedCode": "import pytest\nfrom airflow.models import DagBag\n\n# Напишите юнит-тест проверки валидности всех DAG репозитория\ndef test_dags_import_errors():\n    pass",
  "initialCode": "import pytest\nfrom airflow.models import DagBag\n\ndef test_dags_import_errors():\n    dagbag = DagBag(dag_folder=\"dags/\", include_examples=False)\n    assert len(dagbag.import_errors) == 0, f\"DAG import errors: {dagbag.import_errors}\"",
  "solutionCode": "import pytest\nfrom airflow.models import DagBag\n\ndef test_dags_import_errors():\n    dagbag = DagBag(dag_folder=\"dags/\", include_examples=False)\n    assert len(dagbag.import_errors) == 0, f\"DAG import errors: {dagbag.import_errors}\"",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "import pytest",
      "from airflow.models import DagBag",
      "test_dags_import_errors",
      "include_examples=False",
      "assert len(dagbag.import_errors) == 0"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #808: Синтаксическая ошибка в одном файле сломала парсер всех DAG",
    "incidentDescription": "Разработчик залил опечатку в синтаксисе в main, из-за чего Airflow Scheduler упал с ImportError.",
    "buggyCode": "# Деплой в прод без pytest тестов\ngit push origin main",
    "fixHint": "Добавьте в CI обязательный шаг pytest tests/test_dag_integrity.py с проверкой dagbag.import_errors.",
    "solutionCode": "pytest tests/test_dag_integrity.py",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Используйте класс `DagBag` из модуля `airflow.models`.",
    "Параметр `include_examples=False` отключает стандартные примеры Airflow.",
    "Проверьте словарь ошибок: `assert len(dagbag.import_errors) == 0`."
  ]
};
