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
];
