import type { Lesson } from '@/types/course';

export const pandasLesson11: Lesson = {
  id: 'pandas-11',
  moduleSlug: 'pandas',
  order: 11,
  title: 'Polars Lazy API: scan_csv, оптимизатор запросов и стриминг',
  estimatedMinutes: 35,

  theoryBlocks: [
    {
      type: 'markdown',
      content: [
        "## Eager против Lazy: что меняется",
        "",
        "`pl.read_csv` — **eager**-режим: файл читается целиком, каждая операция выполняется сразу и порождает новый DataFrame в памяти. `pl.scan_csv` возвращает `LazyFrame`: данные не читаются вообще, Polars лишь записывает **логический план** — дерево операций (`scan → filter → group_by → agg`). Выполнение начинается только при вызове `collect()`. Благодаря этому у движка появляется то, чего нет у eager-режима: возможность **переписать план целиком** до первого прочитанного байта.",
        "",
        "### Что делает оптимизатор",
        "",
        "- **Predicate Pushdown.** Фильтр спускается к самому сканеру: строки, не прошедшие условие, отбрасываются сразу при разборе файла и не доезжают до следующих операторов. Для Parquet это ещё и пропуск целых row groups по min/max-статистике, то есть реальная экономия ввода-вывода.",
        "- **Projection Pushdown.** Сканер читает только те столбцы, которые нужны запросу. Если в файле 7 столбцов, а запрос трогает 4, остальные три не материализуются.",
        "- **Прочие правила:** выталкивание `limit` и `slice`, упрощение выражений (constant folding), устранение общих подпланов.",
        "",
        "План можно увидеть: `q.explain()` показывает оптимизированный план, `q.explain(optimized=False)` — исходный. Признак работающих pushdown внутри узла сканирования выглядит так (формат зависит от версии, ориентируйтесь на смысл):",
        "",
        "```text",
        "AGGREGATE",
        "  [len(), col(\"amount_cents\").sum(), col(\"latency_ms\").mean()] BY [col(\"country\")]",
        "  FROM",
        "  Csv SCAN [/tmp/events_lazy.csv]",
        "  PROJECT 4/7 COLUMNS",
        "  SELECTION: [(col(\"status_code\")) == (200)]",
        "```",
        "",
        "Строка `PROJECT 4/7 COLUMNS` — это projection pushdown, а `SELECTION` внутри узла `Csv SCAN` — predicate pushdown. Если фильтр остался отдельным узлом над сканером, оптимизация не сработала (типичная причина — `map_elements` с Python-функцией: для движка это чёрный ящик).",
      ].join('\n'),
    },
    {
      type: 'callout',
      variant: 'analogy',
      title: '💡 На пальцах',
      content:
        "Eager — это когда вы перевозите домой всю библиотеку и уже там ищете нужные три книги. Lazy — это когда вы отдаёте библиотекарю список заявок. Он сам составляет маршрут: снимает с полок только нужные книги (projection), не берёт те, что не подходят по условию (predicate), и выносит их тележками по частям (streaming). Дом остаётся пустым, а результат тот же.",
    },
    {
      type: 'before-after-table',
      data: {
        title: 'Один и тот же запрос на CSV больше оперативной памяти',
        beforeDescription:
          'До: pl.read_csv + filter + group_by. Каждый шаг материализует данные, пик памяти не меньше размера файла.',
        beforeColumns: ['Этап', 'Что происходит', 'Память'],
        beforeRows: [
          ['read_csv', 'парсит все 7 столбцов и все строки', 'весь файл в RAM'],
          ['filter', 'фильтрует уже загруженное', 'копия строк после фильтра'],
          ['group_by + agg', 'считает по отфильтрованному', 'ещё один промежуточный результат'],
          ['Итог', 'пик не меньше размера файла', 'OOM, если файл больше RAM'],
        ],
        afterDescription:
          'После: scan_csv + collect(engine="streaming"). Оптимизатор спускает фильтр и выбор столбцов в сканер, данные идут батчами.',
        afterColumns: ['Этап', 'Что происходит', 'Память'],
        afterRows: [
          ['scan_csv', 'строит план, данные не читает', 'почти ноль'],
          ['optimizer', 'фильтр и 4 из 7 столбцов уходят в сканер', 'лишние данные не читаются'],
          ['collect(engine="streaming")', 'читает и считает батчами', 'батч плюс таблица групп'],
          ['Итог', 'пик не зависит от размера файла', 'укладывается в лимит'],
        ],
        highlightDiffIndices: [
          { row: 0, col: 2 },
          { row: 1, col: 2 },
          { row: 2, col: 2 },
          { row: 3, col: 2 },
        ],
      },
    },
    {
      type: 'markdown',
      content: [
        "### Стриминг: данные идут батчами",
        "",
        "`q.collect(engine='streaming')` исполняет запрос потоком: файл читается порциями, каждая порция проходит по цепочке операторов, а в памяти остаётся лишь **состояние операторов**. У `group_by` это хэш-таблица групп, поэтому память растёт с числом уникальных ключей (кардинальностью), а не с числом строк. Агрегат по 6 странам на файле в 100 ГБ почти ничего не весит, а группировка по `session_id` с миллиардом ключей по-прежнему может упереться в память.",
        "",
        "**Про версии.** В Polars 1.x стриминг включался флагом `collect(streaming=True)`. Он объявлен устаревшим в версии 1.25 и удалён в 2.0: теперь используется `collect(engine='streaming')`, а в 2.0 значение `engine='auto'` для `LazyFrame` по умолчанию тоже выбирает стриминговый движок. Явная запись `engine='streaming'` остаётся самой читаемой и не зависит от настроек окружения.",
        "",
        "**Про порядок строк.** Стриминговый движок не гарантирует порядок строк в `group_by`, `join` и ряде других операций. Если порядок важен (отчёты, снапшот-тесты), добавляйте явный `sort` в конец запроса или `maintain_order=True` там, где параметр доступен. Часть операций (например, некоторые оконные выражения) может выполняться вне стриминга, поэтому проверяйте план: `q.explain(engine='streaming')`.",
        "",
        "### Ловушки Lazy API",
        "",
        "- **Ранний `collect()`** посреди цепочки возвращает eager DataFrame и отключает всю оптимизацию дальше.",
        "- **`map_elements` и `map_batches`** с Python-функциями блокируют pushdown, не параллелятся из-за GIL и медленнее нативных выражений в десятки раз. Используйте встроенные выражения (`pl.when`, `str.*`, `dt.*`).",
        "- **Вывод схемы по первым строкам.** `scan_csv` определяет типы по первым 100 строкам (`infer_schema_length`). Если на строке 5000 в числовом столбце встретится `'N/A'`, запрос упадёт в середине выполнения. Задавайте `schema_overrides` или увеличивайте `infer_schema_length`.",
        "- **CSV не колоночный.** Projection pushdown на CSV экономит память и CPU (лишние столбцы не материализуются), но сам файл всё равно читается и токенизируется. Настоящая экономия ввода-вывода появляется на Parquet.",
      ].join('\n'),
    },
    {
      type: 'callout',
      variant: 'prod-danger',
      title: '⚠️ Грабли в проде: OOM из-за eager-режима и «уплывший» порядок строк',
      content: [
        "**Инцидент 1. Eager на 40 ГБ.** Сервис отчётов читал выгрузку через `pl.read_csv` в контейнере с 16 ГБ RAM. Пока файл был 8 ГБ, всё работало, после роста до 40 ГБ процесс стал получать `OOMKilled`. Платформа бесконечно перезапускала контейнер, а отчёт не выходил. Лечится переводом на `scan_csv` и `collect(engine='streaming')`.",
        "",
        "**Инцидент 2. Потерянная ленивость.** Разработчик вставил `.collect()` после чтения «чтобы посмотреть на данные», а дальше продолжил цепочку на eager DataFrame. Pushdown исчезли, и запрос снова грузил файл целиком.",
        "",
        "**Инцидент 3. Новый порядок строк после обновления.** После перехода на Polars 2.0 `collect()` для `LazyFrame` стал использовать стриминговый движок, и порядок групп в `group_by` изменился. Снапшот-тесты витрины и diff в CI посыпались. Исправление: явный `sort` перед записью результата.",
        "",
        "**Инцидент 4. Падение на 30-й минуте.** Пустое значение `'N/A'` на 5000-й строке числового столбца вызвало ошибку разбора, потому что тип вывелся по первым 100 строкам. Явная схема (`schema_overrides`) делает падение предсказуемым.",
      ].join('\n'),
    },
    {
      type: 'callout',
      variant: 'interview',
      title: '🎯 Спросят на собесе',
      content: [
        "**Вопрос (Middle/Senior):** «Чем `scan_csv` отличается от `read_csv`? Что такое predicate и projection pushdown? Как посчитать агрегат на файле, который не помещается в память?»",
        "",
        "**Разбор.** `read_csv` сразу материализует весь файл, а `scan_csv` строит логический план, который оптимизатор переписывает до исполнения. Predicate pushdown переносит фильтр в узел сканирования, projection pushdown ограничивает чтение нужными столбцами. Для файла больше RAM строится ленивый запрос и вызывается `collect(engine='streaming')`: данные идут батчами, а память определяется состоянием операторов (для `group_by` это число уникальных ключей). Проверить, что оптимизация сработала, можно через `explain()`: ищите `PROJECT n/m COLUMNS` и `SELECTION` внутри `SCAN`.",
        "",
        "**Для Senior:** объясните границы. Во-первых, на CSV pushdown не уменьшает объём прочитанных байт, а на Parquet пропускает row groups по статистике и читает только нужные column chunks. Во-вторых, стриминг не освобождает от кардинальности: группировка по почти уникальному ключу всё равно раздувает хэш-таблицу. В-третьих, порядок строк в стриминговом движке не гарантируется. Если результат больше памяти, используйте `sink_parquet` для записи на диск без материализации. Для сравнения: это тот же принцип, что Catalyst в Spark.",
      ].join('\n'),
    },
  ],

  glossaryTerms: [
    {
      term: 'LazyFrame',
      definition:
        'Ленивый аналог DataFrame в Polars: хранит логический план запроса и не читает данные, пока не вызван collect().',
    },
    {
      term: 'Логический план',
      definition:
        'Дерево операций запроса (scan, filter, group_by, agg). Оптимизатор переписывает его до исполнения, увидеть план можно через explain().',
    },
    {
      term: 'Predicate Pushdown',
      definition:
        'Оптимизация, при которой фильтр выполняется на уровне сканирования источника, поэтому лишние строки не попадают в дальнейшие операторы.',
    },
    {
      term: 'Projection Pushdown',
      definition:
        'Оптимизация, при которой сканер читает только столбцы, нужные запросу (в плане видно как PROJECT 4/7 COLUMNS).',
    },
    {
      term: 'Streaming engine',
      definition:
        'Режим исполнения, обрабатывающий данные батчами: в памяти хранится лишь состояние операторов. Включается через collect(engine="streaming").',
    },
    {
      term: 'maintain_order',
      definition:
        'Параметр, требующий сохранить порядок строк в операциях, где стриминговый движок его не гарантирует (group_by, join). Альтернатива: явный sort в конце запроса.',
    },
    {
      term: 'infer_schema_length',
      definition:
        'Число первых строк CSV, по которым scan_csv выводит типы столбцов. Нетипичное значение дальше этой границы приведёт к ошибке разбора.',
    },
    {
      term: 'sink_parquet',
      definition:
        'Метод LazyFrame, записывающий результат запроса в Parquet потоково, без материализации всего результата в памяти.',
    },
  ],

  schemaPreview: [
    {
      tableName: 'events_lazy.csv (csv_path)',
      description:
        'CSV на 100 000 строк по пути csv_path. Значения генерируются случайно (seed 2027), ниже показана структура. Запрос использует 4 из 7 столбцов.',
      columns: [
        { name: 'event_id', type: 'Int64', keyType: 'PK' },
        { name: 'user_id', type: 'Int64' },
        { name: 'session_id', type: 'String' },
        { name: 'country', type: 'String' },
        { name: 'status_code', type: 'Int64' },
        { name: 'latency_ms', type: 'Float64' },
        { name: 'amount_cents', type: 'Int64' },
      ],
      sampleRows: [
        { event_id: 1, user_id: 2740, session_id: 'S308415592', country: 'RU', status_code: 200, latency_ms: 412.7, amount_cents: 31250 },
        { event_id: 2, user_id: 915, session_id: 'S871003468', country: 'UZ', status_code: 404, latency_ms: 58.3, amount_cents: 0 },
        { event_id: 3, user_id: 4388, session_id: 'S140926071', country: 'KZ', status_code: 200, latency_ms: 689.9, amount_cents: 7800 },
      ],
    },
  ],

  taskDescription: [
    "## Задание: ленивый запрос с проверкой плана и стримингом",
    "",
    "В переменной `csv_path` лежит путь к CSV-файлу на 100 000 строк. Модуль `polars` (`pl`) уже импортирован. Нужно посчитать метрики по успешным запросам из трёх стран, не читая файл целиком.",
    "",
    "1. **Ленивое чтение.** Создайте `lf = pl.scan_csv(csv_path)` и выведите `type(lf).__name__`: должно получиться `LazyFrame`. Данные при этом не читаются.",
    "2. **Цепочка запроса `q`** (без промежуточных `collect`): `.filter()` по условию `status_code == 200` и `country` в `['RU', 'KZ', 'BY']`; `.group_by('country')`; `.agg()` с метриками `requests_cnt` (`pl.len()`), `revenue_cents` (сумма `amount_cents`), `avg_latency_ms` (среднее `latency_ms`, округление до 2 знаков); `.select()` столбцов в порядке `country`, `requests_cnt`, `revenue_cents`, `avg_latency_ms`; `.sort('country')`.",
    "3. **План.** Выведите `q.explain(optimized=False)` и `q.explain()`. В оптимизированном плане найдите внутри узла сканирования строку вида `PROJECT 4/7 COLUMNS` (projection pushdown) и `SELECTION` (predicate pushdown).",
    "4. **Выполнение.** Соберите результат через `result = q.collect(engine='streaming')`. В `result` должно быть 3 строки.",
    "",
    "Стриминг не гарантирует порядок групп, поэтому `sort('country')` в конце запроса обязателен. В версиях Polars до 1.31 параметра `engine='streaming'` нет, там используется устаревший флаг `streaming=True`.",
  ].join('\n'),

  seedCode: `import csv
import numpy as np
import polars as pl

rng = np.random.default_rng(2027)
n = 100_000
countries = ['RU', 'KZ', 'BY', 'UZ', 'AM', 'GE']
csv_path = '/tmp/events_lazy.csv'

event_ids = list(range(1, n + 1))
user_ids = rng.integers(1, 5001, n).tolist()
session_ids = ['S' + str(x).zfill(9) for x in rng.integers(0, 10**9, n).tolist()]
country_col = rng.choice(countries, n).tolist()
status_col = rng.choice([200, 201, 400, 404, 500], n).tolist()
latency_col = np.round(rng.uniform(5, 900, n), 1).tolist()
amount_col = rng.integers(0, 50001, n).tolist()

with open(csv_path, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['event_id', 'user_id', 'session_id', 'country', 'status_code', 'latency_ms', 'amount_cents'])
    writer.writerows(zip(event_ids, user_ids, session_ids, country_col, status_col, latency_col, amount_col))
`,

  initialCode: `# csv_path указывает на CSV (100 000 строк). pl (polars) уже импортирован.

df = pl.read_csv(csv_path)
print('Тип объекта:', type(df).__name__, '| строк в памяти:', df.height, '| столбцов:', df.width)

result = (
    df.filter((pl.col('status_code') == 200) & pl.col('country').is_in(['RU', 'KZ', 'BY']))
    .group_by('country')
    .agg(
        pl.len().alias('requests_cnt'),
        pl.col('amount_cents').sum().alias('revenue_cents'),
        pl.col('latency_ms').mean().round(2).alias('avg_latency_ms'),
    )
    .select(['country', 'requests_cnt', 'revenue_cents', 'avg_latency_ms'])
    .sort('country')
)
print(result)
`,

  solutionCode: `lf = pl.scan_csv(csv_path)
print('Тип объекта:', type(lf).__name__)

q = (
    lf.filter((pl.col('status_code') == 200) & pl.col('country').is_in(['RU', 'KZ', 'BY']))
    .group_by('country')
    .agg(
        pl.len().alias('requests_cnt'),
        pl.col('amount_cents').sum().alias('revenue_cents'),
        pl.col('latency_ms').mean().round(2).alias('avg_latency_ms'),
    )
    .select(['country', 'requests_cnt', 'revenue_cents', 'avg_latency_ms'])
    .sort('country')
)

print('--- Исходный план ---')
print(q.explain(optimized=False))
print('--- Оптимизированный план ---')
print(q.explain())

result = q.collect(engine='streaming')
print(result)
`,

  testConfig: {
    checkOrder: true,
    floatPrecision: 2,
    expectedRowCount: 3,
    expectedColumns: ['country', 'requests_cnt', 'revenue_cents', 'avg_latency_ms'],
    requiredAstPatterns: ['scan_csv', 'filter', 'group_by', 'explain', 'collect', 'streaming'],
  },

  brokenProdTask: {
    title: '🔥 Сломанный прод: OOMKilled из-за pl.read_csv',
    incidentDescription: [
      "**Инцидент.** Сервис ночных отчётов падает со статусом `OOMKilled` (код 137): контейнер ограничен 16 ГБ RAM, а выгрузка событий выросла до 40 ГБ. Код читает файл через `pl.read_csv`, то есть в eager-режиме загружает его целиком.",
      "",
      "**Ваша задача:** переведите запрос на Lazy API. Постройте запрос на `pl.scan_csv(csv_path)`, выполните через `collect(engine='streaming')`. В `result` должна быть одна строка со столбцами `input_type` (`LazyFrame`), `requests_cnt` и `revenue_cents`.",
    ].join('\n'),
    buggyCode: `df = pl.read_csv(csv_path)
input_type = type(df).__name__
filtered = df.filter(pl.col('status_code') == 200)

result = pl.DataFrame({
    'input_type': [input_type],
    'requests_cnt': [filtered.height],
    'revenue_cents': [int(filtered['amount_cents'].sum())],
})
print(result)
`,
    fixHint: "Замените pl.read_csv на pl.scan_csv(csv_path), постройте фильтр и агрегаты внутри одного ленивого запроса и вызовите collect(engine='streaming').",
    solutionCode: `q = (
    pl.scan_csv(csv_path)
    .filter(pl.col('status_code') == 200)
    .select(
        pl.len().alias('requests_cnt'),
        pl.col('amount_cents').sum().alias('revenue_cents'),
    )
)
input_type = type(q).__name__
totals = q.collect(engine='streaming')

result = pl.DataFrame({
    'input_type': [input_type],
    'requests_cnt': [totals['requests_cnt'][0]],
    'revenue_cents': [totals['revenue_cents'][0]],
})
print(result)
`,
    testConfig: {
      checkOrder: true,
      floatPrecision: 0,
      expectedRowCount: 1,
      expectedColumns: ['input_type', 'requests_cnt', 'revenue_cents'],
      requiredAstPatterns: ['scan_csv', 'collect', 'streaming'],
    },
  },

  hints: [
    "Не читайте файл через read_csv: постройте ленивый запрос на pl.scan_csv и вызывайте collect только один раз, в самом конце.",
    "Используйте pl.scan_csv(csv_path), .filter(...), .group_by('country').agg(...), .select(...), .sort('country'), q.explain(), q.collect(engine='streaming').",
    "Полное решение использует scan_csv, цепочку ленивых выражений и collect с engine='streaming'.",
  ],
};
