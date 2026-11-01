import { pandasLesson8 } from './pandas-lesson-8';
import { pandasLesson7 } from './pandas-lesson-7';
import { Lesson } from '@/types/course';

export const pandasLessons: Lesson[] = [
  {
    id: 'pandas-1',
    moduleSlug: 'pandas',
    order: 1,
    title: 'Векторизация против циклов и оптимизация памяти (Downcasting типов)',
    estimatedMinutes: 30,
    glossaryTerms: [
      { term: 'Downcasting', definition: 'Приведение числовых типов к меньшей битности (например, int64 в int16 или float64 в float32) для экономии оперативной памяти.' },
      { term: 'Vectorization', definition: 'Выполнение операций над целыми массивами данных на уровне скомпилированных C-библиотек с использованием SIMD-инструкций процессора.' },
      { term: 'Category Type', definition: 'Специальный тип данных в Pandas для колонок с повторяющимися строками, заменяющий строки числовыми ключами словаря.' },
    ],
    schemaPreview: [
      {
        tableName: 'ecommerce_orders',
        description: 'Датасет интернет-заказов (миллионы строк)',
        columns: [
          { name: 'order_id', type: 'INT64', keyType: 'PK' },
          { name: 'quantity', type: 'INT64' },
          { name: 'price', type: 'FLOAT64' },
          { name: 'order_status', type: 'OBJECT' },
        ],
        sampleRows: [
          { order_id: 1001, quantity: 2, price: 49.99, order_status: 'DELIVERED' },
          { order_id: 1002, quantity: 1, price: 120.00, order_status: 'PROCESSING' },
          { order_id: 1003, quantity: 5, price: 15.50, order_status: 'DELIVERED' },
        ],
      },
    ],
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Физика памяти DataFrame: почему Pandas сжирает 32 ГБ RAM на ровном месте

По умолчанию Pandas создавался для удобства Data Science, а не для экстремальной производительности Data Engineering.

При вызове стандартного \`pd.read_csv("orders.csv")\` Pandas применяет самые «жирные» типы по умолчанию:
* Все целые числа сохраняются как **\`int64\` (8 байт на число)**, даже если это колонка \`quantity\`, где числа не превышают 10!
* Все числа с плавающей точкой становятся **\`float64\` (8 байт на число)**.
* Все текстовые строки сохраняются с типом **\`object\`**.

Тип \`object\` в Pandas — это не непрерывный массив строк! Это массив указателей CPython на отдельные объекты строк в куче (heap). Если в датасете 10 000 000 строк, в памяти создается 10 миллионов отдельных \`PyObject\`, каждый из которых имеет свой заголовок и счетчик ссылок. Память улетает в космос за секунды.

#### Даункастинг (Downcasting): сокращаем RAM на 75%
Большинство числовых колонок не требуют диапазона \`int64\` (от -9 квинтиллионов до +9 квинтиллионов):
* \`int8\`: от -128 до 127 (1 байт)
* \`int16\`: от -32 768 до 32 767 (2 байта — идеально для количества товаров)
* \`int32\`: до 2 миллиардов (4 байта — достаточно для 99% ID)
* \`category\`: заменяет повторяющиеся строки (статусы заказов, страны, валюты) на числовой словарь. Вместо 50 байт на строку расходуется 1 байт на указатель!

\`\`\`python
# Оптимизация памяти в 4 раза одной строчкой:
df['quantity'] = pd.to_numeric(df['quantity'], downcast='integer')
df['order_status'] = df['order_status'].astype('category')
\`\`\`

#### Грех дата-инженера: циклы for и iterrows()
Когда вы пишете:
\`\`\`python
# ❌ УЖАСАЮЩЕ МЕДЛЕННО (150 секунд на 1 миллион строк)
for index, row in df.iterrows():
    df.loc[index, 'total'] = row['quantity'] * row['price']
\`\`\`
На каждой итерации Pandas создает новый объект \`pd.Series\`, выполняет динамическую диспетчеризацию типов и обращается к словарю атрибутов.

Векторизованный подход:
\`\`\`python
# ✅ МГНОВЕННО (0.003 секунды — ускорение в 50 000 раз!)
df['total'] = df['quantity'] * df['price']
\`\`\`
Векторизация передает указатели на плоские блоки памяти напрямую в Си-библиотеки NumPy. Процессор выполняет умножение чисел векторными регистрами AVX/SIMD на полной скорости шины памяти!`,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Коробка для обуви',
        content: `Представьте, что вам нужно упаковать 1000 пар детских носков.
        
Подход типов по умолчанию \`int64\` — это взять 1000 огромных картонных коробок из-под холодильников и положить в каждую по одному детскому носку. Ваш склад мгновенно заполнится, и места не останется.
        
Подход \`downcasting\` — сложить детские носки в маленькие прозрачные пакетики. Все 1000 носков поместятся в один ящик стола.`,
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Превращение int в float из-за одного NaN',
        content: `Исторически в Pandas NumPy-бэкенд не поддерживал значения \`NaN\` для целочисленных типов.
        
Если в колонке из 50 000 000 идентификаторов пользователей (\`user_id\` типа int64) появлялось хотя бы ОДНО значение \`NaN\`, Pandas неявно и молча конвертировал ВСЮ колонку во \`float64\`.
        
В результате:
1. Потребление памяти удваивалось.
2. Большие ID (например, 64-битные снежинки Twitter Snowflake \`172948192849182931\`) теряли точность младших разрядов из-за мантиссы float, превращаясь в \`172948192849182900\`!
        
**Решение:** Всегда использовать современные nullable-типы Pandas с заглавной буквы: \`dtype='Int64'\`.`,
      },
      {
        type: 'callout',
        variant: 'interview',
        title: '🎯 Спросят на собесе: Почему df.apply() — это тот же цикл for под капотом?',
        content: `Многие ошибочно считают \`df.apply(lambda row: ...)\` векторизованной операцией. 
Это заблуждение. \`apply()\` — это просто синтаксический сахар над обычным циклом Python на уровне CPython. Он не может использовать векторные инструкции процессора SIMD и точно так же страдает от накладных расходов на создание объектов и GIL. 
Настоящая векторизация возможна только через встроенные операторы Series/DataFrame, функции NumPy (\`np.where\`, \`np.select\`) или перевод вычислений в Polars.`,
      },
    ],
    taskDescription: `Реализуйте функцию 'calculate_vectorized_revenue(df)', которая принимает датафрейм (или словарь списков) с ключами 'quantity' и 'price', рассчитывает общую выручку по каждой строке векторизованным способом, округляет до 2 знаков после запятой и возвращает список значений 'total_revenue'.`,
    seedCode: `# Тестовый датасет
import pandas as pd
test_df = pd.DataFrame({
    "quantity": [2, 5, 10, 1],
    "price": [19.99, 10.50, 4.25, 150.00]
})`,
    initialCode: `def calculate_vectorized_revenue(df):
    """
    Рассчитывает общую сумму векторизованно без циклов.
    Возвращает список округленных чисел.
    """
    # Ваш векторизованный код здесь
    pass`,
    solutionCode: `def calculate_vectorized_revenue(df):
    totals = (df["quantity"] * df["price"]).round(2)
    return totals.tolist()`,
    testConfig: {
      checkOrder: true,
      floatPrecision: 2,
    },
    brokenProdTask: {
      title: 'Инцидент #110: Скрипт завис на 3 часа из-за iterrows()',
      incidentDescription: 'Дата-инженер перемножал две колонки в датафрейме на 5 000 000 строк через цикл for row in df.iterrows(), парализовав очередь воркеров Airflow на 3 часа.',
      buggyCode: `def compute_tax(df):
    results = []
    for _, row in df.iterrows():
        results.append(row["amount"] * 0.20)
    return results`,
      fixHint: 'Замените цикл на векторизованную операцию: (df["amount"] * 0.20).tolist().',
      solutionCode: `def compute_tax(df):
    return (df["amount"] * 0.20).round(2).tolist()`,
      testConfig: {
        checkOrder: false,
        floatPrecision: 2,
      },
    },
    hints: [
      'Умножьте серии напрямую: df["quantity"] * df["price"].',
      'Для округления используйте метод .round(2).',
      'Для преобразования серии в список используйте метод .tolist().',
    ],
  },
  {
    id: 'pandas-2',
    moduleSlug: 'pandas',
    order: 2,
    title: 'Переход на Polars: Apache Arrow, Lazy API и Predicate Pushdown',
    estimatedMinutes: 35,
    glossaryTerms: [
      { term: 'Apache Arrow', definition: 'Открытый стандарт колоночного представления данных в оперативной памяти без сериализации и накладных расходов на копирование (Zero-Copy).' },
      { term: 'LazyFrame', definition: 'Отложенный план вычислений в Polars, который компилируется и оптимизируется перед реальным выполнением.' },
      { term: 'Projection Pushdown', definition: 'Оптимизация чтения, при которой с накопителя считываются строго те колонки, которые запрошены в финальном плане.' },
    ],
    schemaPreview: [
      {
        tableName: 'lake_telemetry_parquet',
        description: 'Телеметрия серверов в озере данных (миллиарды строк)',
        columns: [
          { name: 'server_id', type: 'INT32' },
          { name: 'cpu_usage', type: 'FLOAT32' },
          { name: 'mem_usage', type: 'FLOAT32' },
          { name: 'region', type: 'STRING' },
        ],
        sampleRows: [
          { server_id: 101, cpu_usage: 42.5, mem_usage: 68.1, region: 'eu-west-1' },
          { server_id: 102, cpu_usage: 95.0, mem_usage: 91.4, region: 'us-east-1' },
        ],
      },
    ],
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Почему Polars стал новым золотым стандартом для Data Engineering

Библиотека **Polars**, написанная на языке **Rust**, фундаментально изменила подход к локальной и кластерной обработке данных.

#### 4 столпа превосходства Polars над Pandas:

1. **Колоночный формат памяти Apache Arrow:**
   Вместо разрозненных Си-массивов NumPy и объектов CPython Polars использует строго стандартизированный буфер Apache Arrow. Это означает, что передача данных между Polars, DuckDB, Spark и PyTorch происходит с **нулевым копированием памяти (Zero-Copy)**.
2. **Многопоточность без GIL:**
   Код Polars написан на чистом Rust. Он вообще не зависит от Global Interpreter Lock (GIL) в CPython. Любая фильтрация, джойн или сортировка автоматически распараллеливается на ВСЕ доступные физические ядра вашего процессора.
3. **Движок выражений (Expression Engine):**
   В Pandas каждое промежуточное выражение (например, \`df[df['a'] > 5]['b']\`) создает временную копию датафрейма в памяти. В Polars выражения объединяются в один граф и выполняются параллельно за один проход по памяти.
4. **Ленивый оптимизатор запросов (Lazy API):**
   При использовании \`pl.scan_parquet()\` или \`pl.scan_csv()\` Polars не считывает ни одного байта данных. Он строит ориентированный граф плана вычислений (DAG) и применяет мощные оптимизации СУБД:
   * **Predicate Pushdown:** Условие \`filter(col("region") == "eu-west-1")\` проталкивается в драйвер чтения Parquet. Целые группы строк (Row Groups) отбрасываются еще до чтения с диска.
   * **Projection Pushdown:** Если из 50 колонок Parquet-файла вам нужны 2 (\`select(["server_id", "cpu_usage"])\`), Polars считывает с диска ровно эти 2 колонки.

#### Сравнение синтаксиса: Eager vs Lazy в Polars
\`\`\`python
import polars as pl

# ❌ Eager: Читает весь файл 50 ГБ в RAM сразу
df = pl.read_parquet("servers_data.parquet")
res = df.filter(pl.col("cpu_usage") > 90.0).select(["server_id"])

# ✅ Lazy: Строит план, фильтрует на уровне чтения диска, RAM < 50 МБ
plan = (
    pl.scan_parquet("servers_data.parquet")
    .filter(pl.col("cpu_usage") > 90.0)
    .select(["server_id"])
)
# Выполнение запускается строго по вызову collect()
result_df = plan.collect()
\`\`\``,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Экскурсия в супермаркет со списком',
        content: `Подход **Eager (Pandas)**: Вы заходите в супермаркет, загружаете в тележку ВСЕ товары со всех полок магазина, привозите тележку на кассу, а на кассе смотрите в свой блокнот и выкидываете 99.9% товаров, оставив только пакет молока.
        
Подход **Lazy (Polars)**: Сначала вы смотрите в свой блокнот (оптимизатор запросов), видите, что вам нужно только молоко, идете целевым маршрутом к полке с молоком, берете один пакет и сразу выходите.`,
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Вызов .to_pandas() уничтожает выгоду',
        content: `Частая ошибка новичков: написать быстрый пайплайн на Polars, а в самом конце перед записью вызвать \`.to_pandas()\`.
        
Что происходит:
Apache Arrow буфер Polars начинает копироваться и конвертироваться в громоздкие структуры NumPy/CPython. На этапе конвертации потребление оперативной памяти резко удваивается, вызывая OOM, а скорость работы падает в 5 раз.
        
**Правило:** Завершайте пайплайн методами Polars: \`.sink_parquet()\` или \`.write_parquet()\` без перехода в Pandas!`,
      },
      {
        type: 'callout',
        variant: 'interview',
        title: '🎯 Спросят на собесе: Что такое Streaming Mode в Polars?',
        content: `При вызове \`plan.collect(streaming=True)\` Polars переключает свой внутренний планировщик в режим потоковой обработки чанками (Chunked Streaming Engine).
Вместо того чтобы загружать в память весь результирующий датасет, Polars читает и обрабатывает данные пакетами по несколько мегабайт, сбрасывая готовые части на диск через \`.sink_parquet()\`.
Это позволяет обрабатывать файлы на 500 ГБ на обычном ноутбуке с 8 ГБ RAM без единого сбоя по памяти!`,
      },
    ],
    taskDescription: `Напишите функцию 'filter_critical_servers(servers_list, cpu_threshold)', которая фильтрует список словарей серверов: оставляет серверы, у которых 'cpu_usage >= cpu_threshold' и 'region == "eu-west-1"'. Функция должна вернуть список 'server_id' этих критических серверов, отсортированный по убыванию 'cpu_usage'.`,
    seedCode: `# Тестовый датасет
servers = [
    {"server_id": 101, "cpu_usage": 45.2, "region": "eu-west-1"},
    {"server_id": 102, "cpu_usage": 92.5, "region": "eu-west-1"},
    {"server_id": 103, "cpu_usage": 96.0, "region": "us-east-1"},
    {"server_id": 104, "cpu_usage": 88.0, "region": "eu-west-1"},
]`,
    initialCode: `def filter_critical_servers(servers_list, cpu_threshold: float = 80.0):
    """
    Фильтрует серверы региона 'eu-west-1' с превышением CPU.
    Возвращает отсортированный список server_id.
    """
    # Ваш код здесь
    pass`,
    solutionCode: `def filter_critical_servers(servers_list, cpu_threshold: float = 80.0):
    filtered = [
        s for s in servers_list 
        if s.get("region") == "eu-west-1" and s.get("cpu_usage", 0) >= cpu_threshold
    ]
    filtered.sort(key=lambda s: s["cpu_usage"], reverse=True)
    return [s["server_id"] for s in filtered]`,
    testConfig: {
      checkOrder: true,
      floatPrecision: 2,
    },
    brokenProdTask: {
      title: 'Инцидент #111: Попытка мутации колонки по индексу сломала Polars пайплайн',
      incidentDescription: 'Разработчик попытался изменить значение в DataFrame Polars через синтаксис Pandas: df["col"][0] = 5, получив ошибку: Polars data structures are immutable.',
      buggyCode: `def update_status(df):
    # В Polars структуры неизменяемы (immutable)!
    df["status"][0] = "FIXED"
    return df`,
      fixHint: 'В Polars используются выражения: df.with_columns(pl.when(...).then(...).otherwise(...)).',
      solutionCode: `def update_status(records):
    # Корректная функциональная модификация
    return [{"status": "FIXED" if r["id"] == 1 else r["status"]} for r in records]`,
      testConfig: {
        checkOrder: false,
        floatPrecision: 2,
      },
    },
    hints: [
      'Используйте list comprehension с условиями s["region"] == "eu-west-1" and s["cpu_usage"] >= cpu_threshold.',
      'Для сортировки по убыванию используйте sorted(..., key=lambda x: x["cpu_usage"], reverse=True).',
      'Верните список server_id: [s["server_id"] for s in sorted_servers].',
    ],
  },
  {
    "id": "pandas-3",
    "moduleSlug": "pandas",
    "order": 3,
    "title": "Оптимизация памяти: downcasting, category и memory_usage(deep=True)",
    "estimatedMinutes": 25,
    "theoryBlocks": [
      {
        "type": "markdown",
        "content": "## Где на самом деле живёт память pandas\n\nКаждый столбец DataFrame — это один непрерывный массив NumPy с **фиксированным dtype**. Для числовых типов всё прозрачно: `int64` занимает ровно 8 байт на значение, `float64` — 8, `bool` — 1. Миллион строк `int64` — это ровно 8 МБ непрерывного куска RAM, без накладных расходов.\n\nС текстом всё иначе. Столбец `object` — это массив из **8-байтовых указателей** на отдельные объекты `PyObject`, разбросанные по куче. Даже короткая строка `'RU'` в CPython весит около 51 байта: заголовок объекта (≈49 байт) плюс сами символы. Поэтому 200 000 значений `'RU'` занимают не 400 КБ, а около 12 МБ — примерно в 30 раз больше, чем полезные данные.\n\n### Почему `memory_usage()` врёт\n\nПо умолчанию `df.memory_usage()` считает только массив указателей (8 байт на ячейку) и **не заглядывает внутрь объектов**. Честную цифру даёт только `df.memory_usage(deep=True)`: он вызывает `sys.getsizeof` для каждого элемента. На текстовых столбцах разница между shallow и deep достигает 10–30 раз. Именно поэтому ноутбук «показывает 40 МБ», а контейнер на 4 ГБ падает по OOM."
      },
      {
        "type": "callout",
        "variant": "analogy",
        "title": "💡 На пальцах",
        "content": "Представьте склад, где все коробки одного размера — под самый большой груз. И зубная щётка, и холодильник едут в одинаковом контейнере. Downcasting — это подбор коробки под реальный груз: числа от 0 до 500 помещаются в коробку на 2 байта, и держать их в коробке на 8 байт — расточительство. А category — это справочник: вместо того чтобы на каждой коробке писать «Российская Федерация», вы клеите наклейку «№1», а расшифровку храните в одном каталоге на всех."
      },
      {
        "type": "before-after-table",
        "data": {
          "title": "Таблица событий на 200 000 строк: память по столбцам (deep=True, МиБ)",
          "beforeDescription": "До оптимизации: типы по умолчанию — int64, float64 и object.",
          "beforeColumns": [
            "Столбец",
            "dtype",
            "МиБ"
          ],
          "beforeRows": [
            [
              "event_id",
              "int64",
              "≈1.53"
            ],
            [
              "user_id",
              "int64",
              "≈1.53"
            ],
            [
              "country",
              "object",
              "≈11.25"
            ],
            [
              "device",
              "object",
              "≈11.70"
            ],
            [
              "status_code",
              "int64",
              "≈1.53"
            ],
            [
              "latency_ms",
              "float64",
              "≈1.53"
            ],
            [
              "amount_cents",
              "int64",
              "≈1.53"
            ],
            [
              "is_bot",
              "bool",
              "≈0.19"
            ],
            ["ИТОГО", "", "≈30.8"]
          ],
          "afterDescription": "После: целые сжаты до uint16/uint32, float до float32, строки превращены в category.",
          "afterColumns": [
            "Столбец",
            "dtype",
            "МиБ"
          ],
          "afterRows": [
            [
              "event_id",
              "uint32",
              "≈0.76"
            ],
            [
              "user_id",
              "uint16",
              "≈0.38"
            ],
            [
              "country",
              "category",
              "≈0.19"
            ],
            [
              "device",
              "category",
              "≈0.19"
            ],
            [
              "status_code",
              "uint16",
              "≈0.38"
            ],
            [
              "latency_ms",
              "float32",
              "≈0.76"
            ],
            [
              "amount_cents",
              "uint16",
              "≈0.38"
            ],
            [
              "is_bot",
              "bool",
              "≈0.19"
            ],
            ["ИТОГО", "", "≈3.2"]
          ],
          "highlightDiffIndices": [
            {
              "row": 0,
              "col": 1
            },
            {
              "row": 0,
              "col": 2
            },
            {
              "row": 1,
              "col": 1
            },
            {
              "row": 1,
              "col": 2
            },
            {
              "row": 2,
              "col": 1
            },
            {
              "row": 2,
              "col": 2
            },
            {
              "row": 3,
              "col": 1
            },
            {
              "row": 3,
              "col": 2
            },
            {
              "row": 4,
              "col": 1
            },
            {
              "row": 4,
              "col": 2
            },
            {
              "row": 5,
              "col": 1
            },
            {
              "row": 5,
              "col": 2
            },
            {
              "row": 6,
              "col": 1
            },
            {
              "row": 6,
              "col": 2
            },
            {
              "row": 8,
              "col": 2
            }
          ]
        }
      },
      {
        "type": "markdown",
        "content": "### Downcasting: подбираем тип под реальный диапазон\n\n| dtype | байт | диапазон |\n|---|---|---|\n| int8 | 1 | от −128 до 127 |\n| uint8 | 1 | от 0 до 255 |\n| int16 | 2 | от −32 768 до 32 767 |\n| uint16 | 2 | от 0 до 65 535 |\n| int32 | 4 | примерно ±2,1 млрд |\n| uint32 | 4 | от 0 до 4,29 млрд |\n| float32 | 4 | ≈7 значащих цифр |\n| float64 | 8 | ≈15–16 значащих цифр |\n\n`pd.to_numeric(s, downcast='unsigned')` смотрит на реальные минимум и максимум столбца и выбирает самый узкий подходящий тип — это безопасно. `astype('int8')`, наоборот, **не проверяет диапазон** и молча переполняет значения: число 500 превратится в −12. Для float `to_numeric(downcast='float')` понижает тип только если значения совпадают с float32 с точностью `1e-8`. Явный `astype('float32')` допустим для метрик, но **никогда для денег**: храните суммы целыми копейками.\n\n### category: словарное кодирование\n\nСтолбец `category` хранит массив **целочисленных кодов** и один словарь уникальных значений. Правило большого пальца: выгодно, когда `nunique() / len(df)` меньше примерно 0.5. Для почти уникальных значений (`session_id`) словарь сам становится размером с данные, и память растёт.\n\n### Оптимизируйте на входе, а не после\n\n`df = pd.read_csv(path)` с автовыводом типов создаёт полноразмерные `int64` и `object`, пик памяти уже случился. Передавайте `dtype={...}`, `usecols=[...]` прямо в `read_csv`."
      },
      {
        "type": "callout",
        "variant": "prod-danger",
        "title": "⚠️ Грабли в проде: тихое переполнение и взрыв кардинальности",
        "content": "**Инцидент 1. Пропавшие 5xx.** Команда ужала `status_code` через `astype('int8')`. Код 500 превратился в −12, 200 — в −56. Условие `status_code >= 500` перестало срабатывать, алерт молчал трое суток.\n\n**Инцидент 2. category на `session_id`.** Столбец с 80 млн уникальных значений перевели в category. Словарь вырос до размера самих данных, а следующий `groupby` убил воркер по OOM."
      },
      {
        "type": "callout",
        "variant": "interview",
        "title": "🎯 Спросят на собесе",
        "content": "**Вопрос:** «CSV на 5 ГБ грузится в pandas, ноутбук показывает 2 ГБ, а процесс на пике занимает 9 ГБ. Как так вышло и что вы будете делать?»\n\n**Разбор:** `memory_usage()` без `deep=True` не учитывает содержимое `object`-столбцов. Пик памяти выше итогового размера из-за промежуточных копий при выводе типов. Решение: задать `dtype` и `usecols` в `read_csv`, использовать `chunksize` или Polars с Lazy API."
      }
    ],
    "glossaryTerms": [
      {
        "term": "dtype",
        "definition": "Тип данных столбца pandas (int64, float32, object, category)."
      },
      {
        "term": "Downcasting",
        "definition": "Понижение разрядности числового типа без потери значений."
      },
      {
        "term": "memory_usage(deep=True)",
        "definition": "Метод, считающий реальную память DataFrame, включая содержимое object-столбцов."
      },
      {
        "term": "Category",
        "definition": "Хранение столбца как массива целочисленных кодов плюс словаря уникальных значений."
      },
      {
        "term": "Integer overflow",
        "definition": "Переполнение целого типа: значение заворачивается при выходе за границы."
      }
    ],
    "schemaPreview": [
      {
        "tableName": "df",
        "description": "Таблица событий (200 000 строк).",
        "columns": [
          {
            "name": "event_id",
            "type": "int64",
            "keyType": "PK"
          },
          {
            "name": "user_id",
            "type": "int64"
          },
          {
            "name": "country",
            "type": "object"
          },
          {
            "name": "device",
            "type": "object"
          },
          {
            "name": "status_code",
            "type": "int64"
          },
          {
            "name": "latency_ms",
            "type": "float64"
          },
          {
            "name": "amount_cents",
            "type": "int64"
          },
          {
            "name": "is_bot",
            "type": "bool"
          }
        ],
        "sampleRows": [
          {
            "event_id": 1,
            "user_id": 1842,
            "country": "RU",
            "device": "ios",
            "status_code": 200,
            "latency_ms": 312.4,
            "amount_cents": 15990,
            "is_bot": false
          }
        ]
      }
    ],
    "taskDescription": "В переменной df лежит таблица из 200 000 событий. 1. Создайте копию df_opt = df.copy() и оптимизируйте её типы (downcast='unsigned' для целых, float32 для latency_ms, category для строк с уникальностью < 0.5). 2. Посчитайте реальную память memory_usage(deep=True, index=False). 3. Соберите итоговый DataFrame result из 8 строк со столбцами column, dtype_before, dtype_after, mb_before, mb_after.",
    "seedCode": "import pandas as pd\nimport numpy as np\n\nrng = np.random.default_rng(42)\nn = 200_000\n\ndf = pd.DataFrame({\n    'event_id': np.arange(1, n + 1, dtype='int64'),\n    'user_id': rng.integers(1, 5001, n).astype('int64'),\n    'country': rng.choice(['RU', 'KZ', 'BY', 'UZ', 'AM', 'GE'], n).astype(object),\n    'device': rng.choice(['ios', 'android', 'web'], n).astype(object),\n    'status_code': rng.choice([200, 201, 400, 404, 500], n).astype('int64'),\n    'latency_ms': np.round(rng.uniform(5, 900, n), 1).astype('float64'),\n    'amount_cents': rng.integers(0, 50001, n).astype('int64'),\n    'is_bot': rng.choice([True, False], n),\n})\n",
    "initialCode": "df_opt = df.copy()\n\n# Оптимизируйте типы df_opt\n\nbefore = df.memory_usage(deep=True, index=False)\nafter = df_opt.memory_usage(deep=True, index=False)\n\nresult = pd.DataFrame({\n    'column': list(df.columns),\n    'dtype_before': [str(t) for t in df.dtypes],\n    'dtype_after': [str(t) for t in df_opt.dtypes],\n    'mb_before': (before / 1024**2).round(2).values,\n    'mb_after': (after / 1024**2).round(2).values,\n})\n",
    "solutionCode": "df_opt = df.copy()\nfor col in ['event_id', 'user_id', 'status_code', 'amount_cents']:\n    df_opt[col] = pd.to_numeric(df_opt[col], downcast='unsigned')\ndf_opt['latency_ms'] = df_opt['latency_ms'].astype('float32')\nfor col in df_opt.select_dtypes(include='object').columns:\n    if df_opt[col].nunique() / len(df_opt) < 0.5:\n        df_opt[col] = df_opt[col].astype('category')\n\nbefore = df.memory_usage(deep=True, index=False)\nafter = df_opt.memory_usage(deep=True, index=False)\n\nresult = pd.DataFrame({\n    'column': list(df.columns),\n    'dtype_before': [str(t) for t in df.dtypes],\n    'dtype_after': [str(t) for t in df_opt.dtypes],\n    'mb_before': (before / 1024**2).round(2).values,\n    'mb_after': (after / 1024**2).round(2).values,\n})\n",
    "testConfig": {
      "checkOrder": true,
      "floatPrecision": 2,
      "expectedRowCount": 8,
      "expectedColumns": [
        "column",
        "dtype_before",
        "dtype_after",
        "mb_before",
        "mb_after"
      ],
      "requiredAstPatterns": [
        "to_numeric",
        "category",
        "memory_usage"
      ]
    },
    "brokenProdTask": {
      "title": "🔥 Сломанный прод: пропали все 5xx",
      "incidentDescription": "Команда ужала status_code через astype('int8'), из-за чего код 500 превратился в −12, и алерты упали.",
      "buggyCode": "df_small = df.copy()\ndf_small['status_code'] = df_small['status_code'].astype('int8')\nserver_errors = int((df_small['status_code'] >= 500).sum())\nresult = pd.DataFrame({'server_errors': [server_errors], 'status_code_dtype': [str(df_small['status_code'].dtype)]})\n",
      "fixHint": "Используйте pd.to_numeric(..., downcast='integer') вместо astype('int8').",
      "solutionCode": "df_small = df.copy()\ndf_small['status_code'] = pd.to_numeric(df_small['status_code'], downcast='integer')\nserver_errors = int((df_small['status_code'] >= 500).sum())\nresult = pd.DataFrame({'server_errors': [server_errors], 'status_code_dtype': [str(df_small['status_code'].dtype)]})\n",
      "testConfig": {
        "checkOrder": true,
        "floatPrecision": 2,
        "expectedRowCount": 1,
        "expectedColumns": ["server_errors", "status_code_dtype"],
        "requiredAstPatterns": [
          "to_numeric"
        ]
      }
    },
    "hints": ["Используйте pd.to_numeric с downcast='unsigned' для целых чисел.", "", "Приводите object-колонки с низкой кардинальностью к category."]
  },
  {
    "id": "pandas-4",
    "moduleSlug": "pandas",
    "order": 4,
    "title": "Анатомия pd.merge: взрыв строк, validate и дубликаты в справочниках",
    "estimatedMinutes": 30,
    "theoryBlocks": [
      {
        "type": "markdown",
        "content": "## Как pd.merge работает под капотом\n\n`pd.merge` — это hash join. Pandas **факторизует** ключи обеих таблиц, превращая значения в целочисленные коды через хэш-таблицу, находит индексы совпадений и склеивает новый DataFrame. Стоимость зависит от **размера результата**, а он может многократно превышать размер входных таблиц.\n\n### Формула взрыва строк\n\nПусть `L(k)` — число строк с ключом `k` слева, `R(k)` — справа. `inner join` даёт сумму `L(k) × R(k)`. Если ключ в справочнике продублирован, строка факта размножается (Cartesian Explosion). Pandas не считает это ошибкой, тихо завышая агрегаты.\n\n### Защитные параметры\n\n- `validate='many_to_one'` (или `'one_to_one'`, `'one_to_many'`, `'many_to_many'`) проверяет кардинальность и бросает `MergeError` при дублях в справочнике.\n- `indicator=True` добавляет столбец `_merge` для поиска сирот.\n- `suffixes=('_fact', '_dim')` разделяет одноимённые колонки."
      },
      {
        "type": "callout",
        "variant": "analogy",
        "title": "💡 На пальцах",
        "content": "Кассир подклеивает карточку клиента к чеку. Если в картотеке две карточки на одного человека, чек попадет в отчёт дважды, а сумма завысится. Параметр `validate` — это проверка на входе: «на каждого человека ровно одна карточка»."
      },
      {
        "type": "before-after-table",
        "data": {
          "title": "Один дубль в справочнике: join до и после дедупликации",
          "beforeDescription": "До: у клиента 7 две записи, заказ 101 размножился, выручка 2500 вместо 1500.",
          "beforeColumns": [
            "order_id",
            "customer_id",
            "segment",
            "amount_cents"
          ],
          "beforeRows": [
            [
              "101",
              "7",
              "smb",
              "1000"
            ],
            [
              "101",
              "7",
              "enterprise",
              "1000"
            ],
            [
              "102",
              "8",
              "consumer",
              "500"
            ],
            [
              "ИТОГО",
              "",
              "",
              "2500"
            ]
          ],
          "afterDescription": "После: оставили последнюю запись по updated_at, добавили validate='many_to_one', выручка 1500.",
          "afterColumns": [
            "order_id",
            "customer_id",
            "segment",
            "amount_cents"
          ],
          "afterRows": [
            [
              "101",
              "7",
              "enterprise",
              "1000"
            ],
            [
              "102",
              "8",
              "consumer",
              "500"
            ],
            [
              "ИТОГО",
              "",
              "",
              "1500"
            ]
          ],
          "highlightDiffIndices": [
            {
              "row": 0,
              "col": 2
            },
            {
              "row": 2,
              "col": 3
            }
          ]
        }
      },
      {
        "type": "callout",
        "variant": "prod-danger",
        "title": "⚠️ Грабли в проде: размножение строк и потерянные сироты",
        "content": "**Инцидент 1. Выручка выше банка на 4%.** Неидемпотентный перезапуск загрузки справочника клиентов создал дубли. Отчёт размножил заказы, финансовая выручка разошлась с банком.\n\n**Инцидент 2. Пропавшие заказы.** Попытка «починить» дубли через `how='inner'` молча отбросила заказы клиентов, отсутствующих в справочнике."
      },
      {
        "type": "callout",
        "variant": "interview",
        "title": "🎯 Спросят на собесе",
        "content": "**Вопрос:** «Что произойдет при merge, если ключ дублируется в обеих таблицах? Как защитить пайплайн?»\n\n**Разбор:** Возникает Cartesian Explosion (`L(k) × R(k)`), агрегаты завышаются. Защита в три слоя: контракт данных (проверка уникальности на входе), код (`validate='many_to_one'` и `assert len(merged) == len(orders)`), мониторинг сходимости сумм."
      }
    ],
    "glossaryTerms": [
      {
        "term": "Hash join",
        "definition": "Алгоритм соединения: построение хэш-таблицы по ключам и поиск совпадений."
      },
      {
        "term": "Cartesian Explosion",
        "definition": "Размножение строк при соединении по неуникальным ключам."
      },
      {
        "term": "validate",
        "definition": "Параметр pd.merge для проверки кардинальности связи."
      },
      {
        "term": "Сироты",
        "definition": "Строки факта, не имеющие пары в справочнике."
      }
    ],
    "schemaPreview": [
      {
        "tableName": "orders",
        "description": "Факт заказов (5 000 строк).",
        "columns": [
          {
            "name": "order_id",
            "type": "int64",
            "keyType": "PK"
          },
          {
            "name": "customer_id",
            "type": "int64",
            "keyType": "FK"
          },
          {
            "name": "amount_cents",
            "type": "int64"
          }
        ],
        "sampleRows": [
          {
            "order_id": 1,
            "customer_id": 42,
            "amount_cents": 15990
          }
        ]
      }
    ],
    "taskDescription": "1. Посчитайте дубли в customers через duplicated().sum(). 2. Получите customers_dedup, оставив самую свежую запись по updated_at через sort_values и drop_duplicates(keep='last'). 3. Сделайте left join с orders, используя validate='many_to_one'. 4. Замените NaN в segment на 'unknown'. 5. Соберите result с группировкой по segment.",
    "seedCode": "import pandas as pd\nimport numpy as np\n\nrng = np.random.default_rng(7)\nn_customers = 200\nn_orders = 5000\nsegments = ['smb', 'enterprise', 'consumer']\n\ncustomers = pd.DataFrame({\n    'customer_id': np.arange(1, n_customers + 1, dtype='int64'),\n    'segment': rng.choice(segments, n_customers).astype(object),\n    'updated_at': pd.Timestamp('2026-01-01') + pd.to_timedelta(rng.integers(0, 100, n_customers), unit='D'),\n})\ndups = customers.sample(20, random_state=7).copy()\ndups['segment'] = rng.choice(segments, len(dups)).astype(object)\ndups['updated_at'] = dups['updated_at'] + pd.Timedelta(days=30)\ncustomers = pd.concat([customers, dups], ignore_index=True)\n\norders = pd.DataFrame({\n    'order_id': np.arange(1, n_orders + 1, dtype='int64'),\n    'customer_id': rng.integers(1, 211, n_orders).astype('int64'),\n    'amount_cents': rng.integers(1000, 50001, n_orders).astype('int64'),\n})\n",
    "initialCode": "customers_dedup = customers\nmerged = orders.merge(customers_dedup[['customer_id', 'segment']], on='customer_id', how='left')\nresult = merged.groupby('segment', as_index=False).agg(orders_cnt=('order_id', 'count'), revenue_cents=('amount_cents', 'sum'))\n",
    "solutionCode": "customers_dedup = customers.sort_values(['customer_id', 'updated_at']).drop_duplicates(subset='customer_id', keep='last')\nmerged = orders.merge(customers_dedup[['customer_id', 'segment']], on='customer_id', how='left', validate='many_to_one')\nassert len(merged) == len(orders)\nmerged['segment'] = merged['segment'].fillna('unknown')\nresult = merged.groupby('segment', as_index=False).agg(orders_cnt=('order_id', 'count'), revenue_cents=('amount_cents', 'sum')).sort_values('segment').reset_index(drop=True)\n",
    "testConfig": {
      "checkOrder": true,
      "floatPrecision": 0,
      "expectedRowCount": 4,
      "expectedColumns": [
        "segment",
        "orders_cnt",
        "revenue_cents"
      ],
      "requiredAstPatterns": [
        "merge",
        "validate",
        "drop_duplicates"
      ]
    },
    "brokenProdTask": {
      "title": "🔥 Сломанный прод: выручка выше банка на 4%",
      "incidentDescription": "Дубли в customers размножили заказы.",
      "buggyCode": "merged = orders.merge(customers[['customer_id', 'segment']], on='customer_id', how='left')\nresult = pd.DataFrame({'revenue_cents': [int(merged['amount_cents'].sum())], 'rows_after_join': [len(merged)]})\n",
      "fixHint": "Дедуплицируйте справочник через drop_duplicates и добавьте validate='many_to_one'.",
      "solutionCode": "customers_dedup = customers.sort_values(['customer_id', 'updated_at']).drop_duplicates(subset='customer_id', keep='last')\nmerged = orders.merge(customers_dedup[['customer_id', 'segment']], on='customer_id', how='left', validate='many_to_one')\nresult = pd.DataFrame({'revenue_cents': [int(merged['amount_cents'].sum())], 'rows_after_join': [len(merged)]})\n",
      "testConfig": {
        "checkOrder": true,
        "floatPrecision": 0,
        "expectedRowCount": 1,
        "expectedColumns": ["revenue_cents", "rows_after_join"],
        "requiredAstPatterns": ["validate", "drop_duplicates"]
      }
    },
    "hints": ["Дедуплицируйте справочник customers перед merge.", "", "Используйте validate='many_to_one'."]
  },
  {
    "id": "pandas-5",
    "moduleSlug": "pandas",
    "order": 5,
    "title": "Оконная аналитика в Pandas: transform против agg, cumsum, shift и diff",
    "estimatedMinutes": 30,
    "theoryBlocks": [
      {
        "type": "markdown",
        "content": "## agg сворачивает, transform сохраняет форму\n\n`groupby().agg()` возвращает одну строку на группу. `groupby().transform()` возвращает объект **той же длины, что и исходный**: агрегат «растягивается» (broadcast) на каждую строку своей группы. Это нужно, чтобы добавить к детальным строкам групповой контекст: долю заказа в сумме клиента или отклонение от среднего.\n\n### Что происходит под капотом\n\nPandas факторизует ключ группировки, считает агрегат векторизованно и для `transform` берёт результат по меткам (`take`), раздувая его до длины фрейма за один проход. Схема «agg + merge обратно» добавляет лишний hash join и риск размножения строк.\n\n### Кумулятивные операции и сдвиги\n\n`cumsum`, `shift(n)` и `diff()` внутри `groupby` работают **отдельно по каждой группе** и требуют предварительного `sort_values`, так как зависят от порядка строк."
      },
      {
        "type": "callout",
        "variant": "analogy",
        "title": "💡 На пальцах",
        "content": "Школьный класс: `agg` — это ведомость со средней оценкой класса (фамилии пропали). `transform` — это когда каждому ученику в дневнике дописывают среднюю оценку по классу рядом с его собственными."
      },
      {
        "type": "before-after-table",
        "data": {
          "title": "agg против transform на трёх транзакциях",
          "beforeDescription": "agg: итог по пользователю, строк стало 2, детали потеряны.",
          "beforeColumns": ["user_id", "user_total_cents"],
          "beforeRows": [
            ["A", "", "400"],
            ["B", "", "500"]
          ],
          "afterDescription": "transform: все 3 строки на месте, итог добавлен как столбец.",
          "afterColumns": [
            "tx_id",
            "user_id",
            "amount_cents",
            "user_total_cents",
            "share_pct"
          ],
          "afterRows": [
            [
              "1",
              "A",
              "100",
              "400",
              "25.0"
            ],
            [
              "2",
              "A",
              "300",
              "400",
              "75.0"
            ],
            [
              "3",
              "B",
              "500",
              "500",
              "100.0"
            ]
          ],
          "highlightDiffIndices": [
            {
              "row": 0,
              "col": 3
            },
            {
              "row": 1,
              "col": 3
            },
            {
              "row": 2,
              "col": 3
            }
          ]
        }
      },
      {
        "type": "callout",
        "variant": "prod-danger",
        "title": "⚠️ Грабли в проде: пропущенные NaN-ключи и сдвиги через границы",
        "content": "**Инцидент 1. Недосчитанная выручка.** Параметр `dropna=True` по умолчанию отбросил строки с пустым регионом при `agg`, занизив выручку на 15%.\n\n**Инцидент 2. Сдвиг через границу групп.** Вызов `shift(1)` без `groupby` «перелил» данные последнего пользователя на первую строку следующего."
      }
    ],
    "glossaryTerms": [
      {
        "term": "transform",
        "definition": "Метод groupby, возвращающий результат той же длины и с тем же индексом."
      },
      {
        "term": "agg",
        "definition": "Метод groupby, сворачивающий каждую группу в одну строку."
      },
      {
        "term": "cumsum / shift / diff",
        "definition": "Оконные операции внутри группы: накопительная сумма, сдвиг и разница."
      }
    ],
    "schemaPreview": [
      {
        "tableName": "tx",
        "description": "Транзакции пользователей (100 строк).",
        "columns": [
          {
            "name": "tx_id",
            "type": "int64",
            "keyType": "PK"
          },
          {
            "name": "user_id",
            "type": "int64",
            "keyType": "FK"
          },
          {
            "name": "amount_cents",
            "type": "int64"
          }
        ],
        "sampleRows": [
          {
            "tx_id": 100,
            "user_id": 1,
            "amount_cents": 4700
          }
        ]
      }
    ],
    "taskDescription": "1. Отсортируйте tx по user_id и tx_ts. 2. Добавьте через groupby и transform user_total_cents, share_pct, running_total_cents, prev_amount_cents, delta_cents, tx_number. 3. Отфильтруйте пользователей 1, 2 и 3 в result.",
    "seedCode": "import pandas as pd\nimport numpy as np\nrows = []\nfor u in range(1, 21):\n    for i in range(5):\n        rows.append({'tx_id': u * 100 + i, 'user_id': u, 'tx_ts': pd.Timestamp('2026-01-01') + pd.Timedelta(days=(u % 5) + i * 10), 'amount_cents': 1000 + ((u * 37 + i * 91) % 50) * 100})\ntx = pd.DataFrame(rows).sample(frac=1, random_state=42).reset_index(drop=True)\nregions = ['north', 'south', 'east', None]\nsales = pd.DataFrame({'sale_id': list(range(1, 61)), 'region': [regions[i % 4] for i in range(1, 61)], 'amount_cents': [500 + ((i * 37) % 20) * 50 for i in range(1, 61)]})\n",
    "initialCode": "tx_sorted = tx.sort_values(['user_id', 'tx_ts']).reset_index(drop=True)\nresult = tx_sorted[tx_sorted['user_id'].isin([1, 2, 3])]\n",
    "solutionCode": "tx_sorted = tx.sort_values(['user_id', 'tx_ts']).reset_index(drop=True)\ng = tx_sorted.groupby('user_id')['amount_cents']\ntx_sorted['user_total_cents'] = g.transform('sum')\ntx_sorted['share_pct'] = (tx_sorted['amount_cents'] / tx_sorted['user_total_cents'] * 100).round(2)\ntx_sorted['running_total_cents'] = g.cumsum()\ntx_sorted['prev_amount_cents'] = g.shift(1)\ntx_sorted['delta_cents'] = g.diff()\ntx_sorted['tx_number'] = tx_sorted.groupby('user_id').cumcount() + 1\nresult = tx_sorted[tx_sorted['user_id'].isin([1, 2, 3])][['tx_id', 'user_id', 'amount_cents', 'user_total_cents', 'share_pct', 'running_total_cents', 'prev_amount_cents', 'delta_cents', 'tx_number']].reset_index(drop=True)\n",
    "testConfig": {
      "checkOrder": true,
      "floatPrecision": 2,
      "expectedRowCount": 15,
      "expectedColumns": [
        "tx_id",
        "user_id",
        "amount_cents",
        "user_total_cents",
        "share_pct",
        "running_total_cents",
        "prev_amount_cents",
        "delta_cents",
        "tx_number"
      ],
      "requiredAstPatterns": [
        "groupby",
        "transform",
        "cumsum",
        "shift"
      ]
    },
    "brokenProdTask": {
      "title": "🔥 Сломанный прод: выручка по регионам занижена на 25%",
      "incidentDescription": "dropna=True отбросил пустые регионы.",
      "buggyCode": "report = sales.groupby('region', as_index=False).agg(amount_cents=('amount_cents', 'sum'))\nresult = pd.DataFrame({'rows_in_report': [len(report)], 'revenue_cents': [int(report['amount_cents'].sum())], 'rows_without_total': [0]})\n",
      "fixHint": "Замените пропуски на 'unknown' и используйте transform.",
      "solutionCode": "report = sales.copy()\nreport['region'] = report['region'].fillna('unknown')\nreport['region_total_cents'] = report.groupby('region')['amount_cents'].transform('sum')\nresult = pd.DataFrame({'rows_in_report': [len(report)], 'revenue_cents': [int(report['amount_cents'].sum())], 'rows_without_total': [int(report['region_total_cents'].isna().sum())]})\n",
      "testConfig": {
        "checkOrder": true,
        "floatPrecision": 0,
        "expectedRowCount": 1,
        "expectedColumns": [
          "rows_in_report",
          "revenue_cents",
          "rows_without_total"
        ],
        "requiredAstPatterns": ["transform", "fillna"]
      }
    },
    "hints": [
        "Используйте g.transform('sum'), g.cumsum(), g.shift(1), g.diff() внутри groupby.",
        "Не забудьте сначала отсортировать табличку по user_id и tx_ts.",
        ""
      ]
  },
  pandasLesson7,
  pandasLesson8,
];
