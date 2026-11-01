import { Lesson } from '@/types/course';

export const dbtLessons: Lesson[] = [
  {
    id: 'dbt-incremental-models',
    moduleSlug: 'dbt',
    order: 1,
    title: 'dbt & Data Quality: Инкрементальные модели, Jinja-макросы и Data Lineage',
    estimatedMinutes: 40,
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### dbt (data build tool): Трансформации по инженерным канонам software engineering

До появления dbt дата-трансформации представляли собой хаос из тысяч строк нетестируемого SQL, разбросанного по хранимым процедурам и Airflow операторам. **dbt внедрил практики разработки ПО в аналитику**: версионирование Git, автоматическое тестирование, CI/CD, генерацию документации и управление зависимостями через направленный ациклический граф (**DAG Data Lineage**).

#### Виды материализаций (Materializations)
- **view:** легковесное виртуальное представление (\`CREATE VIEW\`). Быстро создается, но вычисляется заново при каждом обращении.
- **table:** физическая таблица на диске (\`CREATE TABLE AS SELECT\`). При каждом запуске таблица полностью пересоздается с нуля (дорого на больших данных).
- **incremental:** инкрементальная таблица. При первом запуске создается полностью, а при последующих — вставляет или обновляет только **дельту новых строк**.
- **ephemeral:** промежуточный CTE, не создающий объектов в базе данных.

#### Архитектура инкрементальной модели
\`\`\`sql
{{
    config(
        materialized='incremental',
        unique_key='order_id',
        incremental_strategy='merge'
    )
}}

SELECT 
    order_id,
    customer_id,
    amount,
    status,
    updated_at
FROM {{ ref('stg_orders') }}

{% if is_incremental() %}
    -- Этот блок выполняется ТОЛЬКО при повторных инкрементальных прогонах!
    WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}
\`\`\`

#### Встроенные тесты качества данных (Data Quality Tests)
В YAML-манифесте \`schema.yml\` объявляются канонические контракты:
1. \`unique\` — отсутствие дубликатов первичного ключа.
2. \`not_null\` — отсутствие NULL в обязательных полях.
3. \`accepted_values\` — валидация перечислений (например, статус только NEW, PAID, CANCELLED).
4. \`relationships\` — целостность внешних ключей (Foreign Key integrity).`,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Почтовый ящик',
        content:
          'Материализация table похожа на то, чтобы каждый вечер сжигать почтовый ящик и строить новый со всеми письмами за 5 лет. Инкрементальная модель (incremental) открывает ящик и докладывает только свежие письма, пришедшие за сегодняшний день.',
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Пропуск блока is_incremental()',
        content:
          'Если в конфиге модели указать \`materialized="incremental"\`, но забыть обернуть фильтрацию в \`{% if is_incremental() %}\`, модель будет каждый день перечитывать и перезаписывать ВСЮ таблицу целиком, съедая террабайты трафика в BigQuery или Snowflake.',
      },
    ],
    glossaryTerms: [
      { term: '{{ ref() }}', definition: 'Ключевой макрос dbt, связывающий модели между собой, определяющий правильный порядок сборки в графе зависимостей и изолирующий среды (dev/prod).' },
      { term: 'Data Lineage', definition: 'Визуальная карта происхождения данных, показывающая цепочку движения информации от сырых таблиц до финальных BI-дашбордов.' },
      { term: 'is_incremental()', definition: 'Jinja-макрос, возвращающий True, если целевая таблица уже существует в базе и запуск не является полным рефрешем (--full-refresh).' },
    ],
    schemaPreview: [
      {
        tableName: 'fct_orders_incremental',
        columns: [
          { name: 'order_id', type: 'BIGINT', keyType: 'PK' },
          { name: 'amount', type: 'NUMERIC(12,2)' },
          { name: 'updated_at', type: 'TIMESTAMP' },
        ],
        sampleRows: [
          { order_id: 101, amount: 1500.0, updated_at: '2026-11-01 01:00:00' },
          { order_id: 102, amount: 2800.0, updated_at: '2026-11-01 02:30:00' },
        ],
      },
    ],
    taskDescription:
      'В тренажере CodeValidatorEngine спроектируйте инкрементальную модель dbt: укажите конфигурацию с `materialized="incremental"`, используйте макрос `{{ ref("stg_orders") }}` для построения Lineage и добавьте фильтрацию дельты через `{% if is_incremental() %}`. Запустите проверку конфигурации и изучите получившийся визуальный граф DAG Lineage.',
    seedCode: '',
    initialCode: `{{
    config(
        materialized='incremental',
        unique_key='order_id'
    )
}}

SELECT
    order_id,
    customer_id,
    total_amount,
    order_status,
    updated_at
FROM {{ ref('stg_orders') }}

{% if is_incremental() %}
    WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}
`,
    solutionCode: `{{ config(materialized='incremental', unique_key='order_id') }}\nSELECT * FROM {{ ref('stg_orders') }}\n{% if is_incremental() %}\nWHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})\n{% endif %}`,
    testConfig: {
      checkOrder: false,
      floatPrecision: 2,
      requiredAstPatterns: ['materialized', 'incremental', 'ref', 'is_incremental'],
    },
    brokenProdTask: {
      title: 'Авария: Зависание DWH из-за хардкода схемы',
      incidentDescription:
        'P1 Incident: Разработчик захардкодил в запросе FROM raw_db.public.stg_orders вместо макроса ref(). При деплое в тестовый контур dbt попытался модифицировать боевую базу прод.',
      buggyCode: 'SELECT * FROM raw_db.public.stg_orders',
      fixHint: 'Замените абсолютный путь на макрос {{ ref("stg_orders") }}.',
      solutionCode: 'SELECT * FROM {{ ref("stg_orders") }}',
      testConfig: { checkOrder: false, floatPrecision: 2 },
    },
    hints: [
      'Укажите materialized="incremental" в блоке config.',
      'Используйте {{ ref("stg_orders") }} для связи в Lineage графе.',
      'Добавьте фильтрацию свежих строк внутри {% if is_incremental() %}.',
    ],
  },
];
