import { Lesson } from '@/types/course';

export const pythonLesson2: Lesson = {
  "id": "python-2",
  "moduleSlug": "python",
  "order": 2,
  "title": "Структуры данных с нуля: Списки (list), кортежи (tuple), словари (dict) и множества (set)",
  "estimatedMinutes": 25,
  "glossaryTerms": [
    {
      "term": "Хэш-таблица",
      "definition": "Структура данных, сопоставляющая ключи значениям через вычисление хэш-функции, обеспечивающая среднюю сложность поиска O(1)."
    },
    {
      "term": "Hashable",
      "definition": "Объект, имеющий неизменный хэш-код на протяжении всей жизни и поддерживающий операцию сравнения __eq__."
    },
    {
      "term": "Асимптотика O(1) vs O(N)",
      "definition": "O(1) означает фиксированное время операции независимо от объема данных; O(N) означает линейный рост времени пропорционально числу элементов."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "staging_payments",
      "description": "Входные платежи клиентов для агрегации",
      "columns": [
        {
          "name": "tx_id",
          "type": "VARCHAR(50)",
          "keyType": "PK"
        },
        {
          "name": "user_id",
          "type": "INT"
        },
        {
          "name": "amount",
          "type": "NUMERIC(10,2)"
        }
      ],
      "sampleRows": [
        {
          "tx_id": "tx_1",
          "user_id": 101,
          "amount": 2500.0
        },
        {
          "tx_id": "tx_2",
          "user_id": 102,
          "amount": 1400.0
        },
        {
          "tx_id": "tx_3",
          "user_id": 101,
          "amount": 3200.0
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Структуры данных: list, tuple, dict, set под капотом\n\nВыбор структуры данных — фундаментальный навык инженера данных. Неправильный тип может замедлить пайплайн в 10 000 раз.\n\n#### 1. Списки (list) и Кортежи (tuple)\n* **`list`:** динамический изменяемый массив указателей. Доступ по индексу — $O(1)$. Добавление в конец `append` — амортизированное $O(1)$. Поиск элемента `x in my_list` — **линейный $O(N)$** (требует последовательного обхода всех элементов!).\n* **`tuple`:** неизменяемый (immutable) массив. Занимает меньше памяти в CPython и может использоваться в качестве ключа словаря или элемента множества.\n\n#### 2. Словари (dict) и Множества (set) — Хэш-таблицы\n* В `set` и `dict` элементы адресуются по результату хэш-функции `hash(key)`.\n* **Поиск, добавление и удаление работают за константное время $O(1)$!**\n\n#### 3. Авария ETL: list против set при дедупликации\nЕсли вы проверяете наличие 500 000 записей в `list`, сложность составляет $O(N^2) \\approx 2.5 \\times 10^{11}$ операций сравнения (часы работы CPU). Замена на `set` снижает сложность до $O(N)$ (доли секунды!)."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Камера хранения против общей стопки",
      "content": "Поиск в списке — это как искать паспорт в куче из 10 000 несортированных бумаг, перекладывая каждый лист ($O(N)$). Поиск в множестве или словаре — это как подойти к ячейке в камере хранения с точным номером ($O(1)$)."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение характеристик базовых структур данных Python",
        "beforeDescription": "Сложность поиска и изменяемость",
        "beforeColumns": [
          "data_structure",
          "lookup_complexity",
          "mutability"
        ],
        "beforeRows": [
          [
            "list",
            "O(N) linear",
            "Mutable"
          ],
          [
            "set",
            "O(1) constant",
            "Mutable"
          ],
          [
            "dict",
            "O(1) constant",
            "Mutable"
          ]
        ],
        "afterDescription": "Рекомендации для применения в Data Engineering",
        "afterColumns": [
          "structure",
          "best_use_case",
          "hashable_required"
        ],
        "afterRows": [
          [
            "set",
            "Fast deduplication",
            "Yes"
          ],
          [
            "dict",
            "Key-value mapping",
            "Keys only"
          ],
          [
            "tuple",
            "Immutable record",
            "Yes if elements are"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Проверка in list на миллионе записей",
      "content": "Классический баг новичка: `seen_ids = []` перед обработкой батча из миллиона строк. На первых 1000 строк код летает, а к 100 000 строкам сервер уходит в 100% CPU lock из-за квадратичной сложности. Замена на `seen_ids = set()` устраняет проблему мгновенно."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Почему список не может быть ключом словаря?",
      "content": "**Ответ:** Чтобы объект мог быть ключом словаря или элементом set, он обязан реализовывать методы `__hash__()` и `__eq__()`, а его хэш не должен меняться в течение времени жизни (быть immutable). Списки изменяемы (mutable), поэтому вызов `hash([1, 2])` вызывает `TypeError: unhashable type: 'list'`."
    }
  ],
  "taskDescription": "Реализуйте функцию deduplicate_and_aggregate(records: list[dict]) -> tuple[dict, set], которая принимает список словарей транзакций с ключами user_id и amount, агрегирует сумму трат каждого пользователя через словарь, собирает уникальные user_id в множество set, и возвращает кортеж (totals_dict, unique_users_set).",
  "seedCode": "transactions = [\n    {\"user_id\": 101, \"amount\": 2500.0},\n    {\"user_id\": 102, \"amount\": 1400.0},\n    {\"user_id\": 101, \"amount\": 3200.0},\n    {\"user_id\": 103, \"amount\": 750.0},\n    {\"user_id\": 102, \"amount\": 600.0},\n]",
  "initialCode": "# Напишите функцию deduplicate_and_aggregate\ndef deduplicate_and_aggregate(records: list[dict]) -> tuple[dict, set]:\n    # 1. Посчитайте суммарный amount по каждому user_id через dict\n    # 2. Соберите уникальные user_id в set\n    # 3. Верните кортеж (totals_dict, unique_users_set)\n    pass",
  "solutionCode": "def deduplicate_and_aggregate(records: list[dict]) -> tuple[dict, set]:\n    totals = {}\n    unique_users = set()\n    for r in records:\n        uid = r[\"user_id\"]\n        amt = r[\"amount\"]\n        unique_users.add(uid)\n        totals[uid] = totals.get(uid, 0.0) + amt\n    return totals, unique_users",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 2,
    "requiredAstPatterns": [
      "get",
      "set"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #202: Зависание пайплайна и KeyError при подсчете балансов",
    "incidentDescription": "Разработчик использовал список для проверки дубликатов и обратился к словарю через totals[uid] += amount без начального значения, что привело к падению с KeyError.",
    "buggyCode": "def deduplicate_and_aggregate(records: list[dict]) -> tuple[dict, set]:\n    totals = {}\n    unique_users = []\n    for r in records:\n        uid = r[\"user_id\"]\n        if uid not in unique_users:\n            unique_users.append(uid)\n        totals[uid] += r[\"amount\"]\n    return totals, set(unique_users)",
    "fixHint": "Замените unique_users на set() и используйте метод dict.get(key, 0.0) для безопасного суммирования.",
    "solutionCode": "def deduplicate_and_aggregate(records: list[dict]) -> tuple[dict, set]:\n    totals = {}\n    unique_users = set()\n    for r in records:\n        uid = r[\"user_id\"]\n        amt = r[\"amount\"]\n        unique_users.add(uid)\n        totals[uid] = totals.get(uid, 0.0) + amt\n    return totals, unique_users",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 2
    }
  },
  "hints": [
    "Инициализируйте totals = {} и unique_users = set().",
    "Используйте unique_users.add(uid) для добавления идентификатора в множество.",
    "Для безопасного добавления к сумме используйте totals[uid] = totals.get(uid, 0.0) + amt."
  ]
};
