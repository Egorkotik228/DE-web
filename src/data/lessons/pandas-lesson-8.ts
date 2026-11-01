import { Lesson } from '@/types/course';

export const pandasLesson8: Lesson = {
  "id": "pandas-8",
  "moduleSlug": "pandas",
  "order": 8,
  "title": "Apache Arrow, Zero-Copy и бенчмаркинг: когда что использовать (Arrow, PyArrow backend & Benchmarking)",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "Apache Arrow",
      "definition": "Открытый стандарт колоночного представления данных в оперативной памяти (In-Memory Columnar Format), обеспечивающий обмен данными между языками без сериализации и копирования (Zero-Copy)."
    },
    {
      "term": "Zero-Copy Data Sharing",
      "definition": "Механизм передачи данных между процессами и библиотеками (Pandas, Polars, DuckDB, PySpark), при котором передаются только указатели на общие страницы памяти без физического дублирования байт в RAM."
    },
    {
      "term": "PyArrow Backend",
      "definition": "Подсистема типизации в Pandas 2.0+, заменяющая устаревшие типы NumPy и массивы указателей PyObject на нативные типы Apache Arrow (например, string[pyarrow], int64[pyarrow]) с поддержкой честных NULL."
    },
    {
      "term": "DuckDB",
      "definition": "Встраиваемая аналитическая колоночная СУБД (OLAP), способная выполнять векторизованные SQL-запросы напрямую поверх Apache Arrow таблиц в оперативной памяти с нулевыми накладными расходами."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "lake_benchmarks",
      "columns": [
        {
          "name": "engine",
          "type": "STRING"
        },
        {
          "name": "memory_mb",
          "type": "FLOAT"
        },
        {
          "name": "latency_ms",
          "type": "FLOAT"
        }
      ],
      "sampleRows": [
        {
          "engine": "Pandas (NumPy)",
          "memory_mb": 1420.5,
          "latency_ms": 3800.0
        },
        {
          "engine": "Pandas (PyArrow)",
          "memory_mb": 310.2,
          "latency_ms": 820.0
        },
        {
          "engine": "Polars (Rust)",
          "memory_mb": 185.0,
          "latency_ms": 190.0
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Архитектурная революция Apache Arrow: Конец эпохи сериализации\n\nНа протяжении двух десятилетий главной болью распределенных систем обработки данных была сериализация и десериализация. Когда данные перемещались между Python (Pandas/NumPy), JVM (Apache Spark), C++ (модули хранения) и хранилищами на диске, до **70–80% процессорного времени** уходило не на вычисления, а на упаковку структур в промежуточные форматы (CSV, JSON, pickle, Parquet) и их повторную распаковку в память.\n\nКаждая среда изобретала свое собственное представление таблицы в RAM: Pandas строил массивы указателей `PyObject` в куче, Spark — бинарные unsafe row, C++ — массивы структур. Передача 10 ГБ данных между Python и C++ требовала 20 ГБ RAM и секунды блокирующего копирования.\n\n#### Стандарт Apache Arrow и физика Zero-Copy\nПроект **Apache Arrow** (созданный Уэсом Маккинни, автором Pandas, и разработчиками Apache Drill/Dremio) решил эту фундаментальную проблему, определив единый независимый от языка стандарт расположения колоночных данных в оперативной памяти.\n\nКлючевые принципы архитектуры Arrow:\n1. **Колоночная организация памяти (Columnar In-Memory):** Значения одной колонки располагаются в памяти последовательно (континуальный буфер). Это обеспечивает феноменальную скорость векторных вычислений благодаря кэш-локальности процессора (L1/L2) и поддержке инструкций SIMD (Single Instruction Multiple Data).\n2. **Унифицированная структура векторов:** Каждый массив Arrow состоит из строго фиксированных буферов:\n   - **Validity Bitmap:** битовая маска, где 1 бит кодирует, является ли соответствующее значение `NULL` или валидным (никаких накладных расходов в 8 байт на каждый `None`!).\n   - **Offsets Buffer:** 32- или 64-битные смещения для строк переменной длины.\n   - **Data Buffer:** сплошной байтовый массив данных.\n3. **Zero-Copy Sharing:** Когда библиотека на Rust (Polars), движок на C++ (DuckDB) и код на Python (Pandas 2.0+) работают с Arrow-данными в одном процессе, они **не копируют данные вообще**. Они передают друг другу 64-битный указатель на начало буфера в shared memory (`Arrow C Data Interface`). Скорость передачи терабайта данных становится мгновенной (микросекунды)!\n\n#### PyArrow бэкенд в Pandas 2.0+: Спасение от object dtype\nДо версии 2.0 ядром Pandas являлся NumPy. У NumPy есть два критических архитектурных изъяна:\n- Он не умеет хранить строки переменной длины, поэтому создает массив указателей `object` на отдельные `PyUnicodeObject`. 10 миллионов строк раздуваются до гигабайтов памяти, а операции со строками работают со скоростью черепахи в один поток.\n- У него нет поддержки честного `NULL` для целых чисел. Появление хотя бы одного пропуска превращает весь столбец `int64` в `float64` с искажением идентификаторов.\n\nВ современном Pandas переход на PyArrow бэкенд решает эти проблемы одной строкой:\n```python\n# Перевод строковой колонки на PyArrow (экономия RAM до 80%)\ndf['city'] = df['city'].astype('string[pyarrow]')\n\n# Чтение Parquet напрямую в типы Arrow с нативными nullable-типами\ndf = pd.read_parquet('events.parquet', dtype_backend='pyarrow')\n```\n\n#### Матрица выбора: Pandas vs Polars vs DuckDB\n1. **Pandas (с PyArrow бэкендом):** Выбирайте, когда датасет помещается в RAM, кодовая база завязана на тысячи специфичных библиотек (scikit-learn, PyTorch, Statsmodels) или требуется максимальная обратная совместимость.\n2. **Polars:** Выбирайте для тяжелого ETL, очистки и трансформации данных. Polars написан на Rust, параллелит вычисления на все ядра CPU без GIL, строит ленивый оптимизированный граф выполнения (`LazyFrame`) и способен обрабатывать терабайтные файлы в потоковом режиме (`streaming=True`).\n3. **DuckDB:** Выбирайте, когда требуется аналитический SQL-интерфейс, мгновенное выполнение сложных оконных функций прямо поверх файлов Parquet/CSV на локальном диске или в S3 без промежуточных баз данных."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Эсперанто для оперативной памяти",
      "content": "Представьте интернациональную команду (русский, китаец, бразилец). Каждый раз, чтобы передать документ, переводчик тратит час на перевод на английский и обратно (сериализация). Apache Arrow — это если бы все трое думали и читали на едином универсальном языке. Один кладет лист бумаги на стол, а второй сразу читает его, не тратя ни секунды на перевод и не переписывая текст на новый лист (Zero-Copy)."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение архитектур хранения данных в памяти: NumPy vs Apache Arrow",
        "beforeDescription": "Классический Pandas 1.x на базе NumPy (Массивы указателей и CPython Object)",
        "beforeColumns": [
          "Метрика",
          "Pandas 1.x (NumPy)",
          "Pandas 2.0+ / Polars (Arrow)"
        ],
        "beforeRows": [
          [
            "Формат строк в RAM",
            "Массив указателей PyObject",
            "Непрерывный буфер Arrow"
          ],
          [
            "Память 10M строк",
            "4.8 ГБ (указатели + объекты)",
            "620 МБ (сжатый непрерывный вектор)"
          ],
          [
            "Передача в Polars/DuckDB",
            "Глубокое копирование O(N) (OOM)",
            "Мгновенный Zero-Copy (указатель 8 байт)"
          ],
          [
            "Поддержка Null для Int",
            "Каст в float64 (потеря типов)",
            "Нативная битовая маска Null"
          ]
        ],
        "afterDescription": "Современный стек на базе Apache Arrow (Zero-Copy и непрерывные векторы)",
        "afterColumns": [
          "Метрика",
          "Pandas 1.x (NumPy)",
          "Pandas 2.0+ / Polars (Arrow)"
        ],
        "afterRows": [
          [
            "Формат строк в RAM",
            "Массив указателей PyObject",
            "Непрерывный буфер Arrow"
          ],
          [
            "Память 10M строк",
            "4.8 ГБ (указатели + объекты)",
            "620 МБ (сжатый непрерывный вектор)"
          ],
          [
            "Передача в Polars/DuckDB",
            "Глубокое копирование O(N) (OOM)",
            "Мгновенный Zero-Copy (указатель 8 байт)"
          ],
          [
            "Поддержка Null для Int",
            "Каст в float64 (потеря типов)",
            "Нативная битовая маска Null"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Иллюзия Zero-Copy при наличии object dtypes",
      "content": "Zero-Copy работает ТОЛЬКО тогда, когда внутренние структуры данных полностью совместимы со спецификацией Arrow. Если в DataFrame осталась хотя бы одна колонка с типом object (стандартные строки Python или смешанные типы), метод конвертации будет вынужден материализовать полный обход каждого элемента и создать глубокую копию. Всегда проверяйте типы колонок через df.dtypes перед экспортом!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Что такое Arrow C Data Interface и почему он изменил мир Data Engineering?",
      "content": "Arrow C Data Interface — это спецификация C ABI (Application Binary Interface), состоящая всего из двух C-структур: ArrowSchema и ArrowArray. Любая библиотека на C, C++, Rust, Go, Java или Python может передать указатель на эти структуры другой библиотеке в том же адресном пространстве процесса. Никаких динамических связываний, никаких разделяемых библиотек — чистый Zero-Copy обмен памятью."
    }
  ],
  "taskDescription": "Реализуйте функцию `benchmark_arrow_pipeline(df: pd.DataFrame) -> pd.DataFrame`, которая:\n1. Оптимизирует строковые колонки входного датафрейма: находит все столбцы с типом 'object' и переводит их в нативный строковый бэкенд PyArrow с типом 'string[pyarrow]'.\n2. Вычисляет агрегацию по колонке 'category': количество строк ('count') и среднюю стоимость ('avg_amount') с округлением до 2 знаков.\n3. Сортирует результат по алфавиту колонки 'category' и возвращает итоговый DataFrame с тремя колонками: ['category', 'count', 'avg_amount'].",
  "seedCode": "import pandas as pd\n\ntest_df = pd.DataFrame({\n    'category': ['electronics', 'apparel', 'electronics', 'books', 'apparel', 'electronics'],\n    'item_name': ['laptop', 'jacket', 'phone', 'novel', 'sneakers', 'charger'],\n    'amount': [1200.50, 85.00, 650.00, 24.99, 110.00, 35.50]\n})",
  "initialCode": "import pandas as pd\n\ndef benchmark_arrow_pipeline(df: pd.DataFrame) -> pd.DataFrame:\n    \"\"\"\n    Применяет PyArrow string backend и выполняет агрегацию.\n    Возвращает DataFrame с колонками ['category', 'count', 'avg_amount'].\n    \"\"\"\n    # Ваш код здесь\n    pass\n\nresult = benchmark_arrow_pipeline(test_df)",
  "solutionCode": "import pandas as pd\n\ndef benchmark_arrow_pipeline(df: pd.DataFrame) -> pd.DataFrame:\n    df_opt = df.copy()\n    for col in df_opt.select_dtypes(include=['object']).columns:\n        df_opt[col] = df_opt[col].astype('string[pyarrow]')\n    \n    agg_df = df_opt.groupby('category', as_index=False).agg(\n        count=('amount', 'count'),\n        avg_amount=('amount', 'mean')\n    )\n    agg_df['avg_amount'] = agg_df['avg_amount'].round(2)\n    agg_df = agg_df.sort_values(by='category').reset_index(drop=True)\n    return agg_df[['category', 'count', 'avg_amount']]\n\nresult = benchmark_arrow_pipeline(test_df)",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 2,
    "requiredAstPatterns": [
      "string[pyarrow]"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #208: OOM при выгрузке 50 млн текстовых записей из Pandas в Parquet",
    "incidentDescription": "Сервис аналитики выгружал логи в S3 Parquet. Из-за типа object при сериализации в PyArrow процесс аллоцировал 30 ГБ памяти на создание промежуточных C-структур и упал по OOM Killer. Перевод колонок на строковый бэкенд PyArrow устраняет аллокацию и ускоряет запись в 4 раза.",
    "buggyCode": "def optimize_string_columns(df):\n    # Ошибка: стандартный тип object раздувает память при экспорте в Parquet\n    return df",
    "fixHint": "Переведите все строковые колонки типа object на нативный бэкенд PyArrow с помощью df[col].astype('string[pyarrow]').",
    "solutionCode": "def optimize_string_columns(df):\n    df_clean = df.copy()\n    for col in df_clean.select_dtypes(include=['object']).columns:\n        df_clean[col] = df_clean[col].astype('string[pyarrow]')\n    return df_clean",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 2,
      "requiredAstPatterns": [
        "string[pyarrow]"
      ]
    }
  },
  "hints": [
    "Используйте цикл по колонкам с типом object: for col in df.select_dtypes(include=['object']).columns: df[col] = df[col].astype('string[pyarrow]').",
    "Для агрегации используйте .groupby('category', as_index=False).agg(count=('amount', 'count'), avg_amount=('amount', 'mean')).",
    "Не забудьте округлить avg_amount до 2 знаков через .round(2) и отсортировать по category."
  ]
};
