import { Lesson } from '@/types/course';

export const clickhouseLessons: Lesson[] = [
  {
    id: 'clickhouse-mergetree-sparse-index',
    moduleSlug: 'clickhouse',
    order: 1,
    title: 'ClickHouse: Разреженный первичный индекс, движок ReplacingMergeTree и партиционирование',
    estimatedMinutes: 40,
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### ClickHouse: Колоночная СУБД для аналитики реального времени (OLAP)

ClickHouse способен выполнять аналитические выборки по миллиардам строк за десятки миллисекунд благодаря векторизованному исполнению инструкций процессора (SIMD), колоночному хранению на диске и **разреженному первичному индексу (Sparse Primary Index)**.

#### Как работает разреженный индекс (Sparse Index) под капотом?
В традиционных реляционных базах (PostgreSQL, Oracle) B-Tree индекс является **плотным (Dense)**: он хранит ссылку на *каждую отдельную строку* таблицы. Если в таблице 1 миллиард строк, индекс занимает десятки гигабайт в оперативной памяти.

ClickHouse использует принципиально иной подход:
1. Данные на диске **физически отсортированы** строго по колонкам, указанным в \`ORDER BY (col1, col2)\`.
2. Таблица делится на гранулы строк (**по умолчанию ровно 8 192 строки в одной грануле**).
3. В оперативную память загружается **только первая строка каждой гранулы** (\`index.mrk\`).
4. При выполнении \`SELECT ... WHERE col1 = 42\` ClickHouse делает бинарный поиск по разреженному индексу в RAM, определяет, в каких именно гранулах на диске могут лежать искомые строки, и читает с диска только эти сжатые блоки!

#### Движок ReplacingMergeTree (Дедупликация версий)
ClickHouse оптимизирован под неизменяемые данные (\`append-only\`). Классический \`UPDATE\` дорог и выполняется через тяжелые мутации. Для обновления записей используется движок \`ReplacingMergeTree(ver)\`:
- При вставке новой версии записи с тем же первичным ключом она просто дописывается на диск в новый кусок (part).
- В фоне, во время асинхронного слияния кусков (Merge), ClickHouse удаляет старые дубликаты, оставляя строку с максимальным значением \`ver\`.
- Для гарантированного получения актуального состояния в запросе используется ключевое слово \`FINAL\` (\`SELECT * FROM table FINAL\`).`,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Оглавление томов словаря',
        content:
          'Плотный индекс Postgres похож на указатель, где для каждого слова в словаре выписан точный номер страницы (огромная книга указателя). Разреженный индекс ClickHouse похож на корешок тома энциклопедии: «Том 1: А — Б», «Том 2: В — Г». Вы сразу знаете, какой том снять с полки, не тратя память.',
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Неправильный порядок колонок в ORDER BY',
        content:
          'Порядок колонок в \`ORDER BY\` критичен! Сначала должны идти колонки с **низкой кардинальностью** (например, \`tenant_id, status\`), а затем с высокой (\`user_id, event_time\`). Если поставить \`event_time\` первым, индекс потеряет способность эффективно фильтровать по \`tenant_id\`!',
      },
    ],
    glossaryTerms: [
      { term: 'Sparse Index', definition: 'Разреженный индекс, сохраняющий одно значение на каждые 8192 строки (гранулу), полностью помещающийся в оперативную память.' },
      { term: 'ReplacingMergeTree', definition: 'Движок ClickHouse, автоматически удаляющий дубликаты первичного ключа во время фоновых слияний кусков (parts).' },
      { term: 'FINAL', definition: 'Модификатор запроса в ClickHouse, форсирующий дедупликацию ReplacingMergeTree на лету во время выполнения SELECT.' },
    ],
    schemaPreview: [
      {
        tableName: 'ch_events',
        columns: [
          { name: 'tenant_id', type: 'UInt32', keyType: 'PK' },
          { name: 'event_time', type: 'DateTime', keyType: 'PK' },
          { name: 'user_id', type: 'UInt64' },
          { name: 'event_type', type: 'LowCardinality(String)' },
          { name: 'version', type: 'UInt64' },
        ],
        sampleRows: [
          { tenant_id: 1, event_time: '2026-11-01 02:00:00', user_id: 42, event_type: 'CLICK', version: 1 },
          { tenant_id: 1, event_time: '2026-11-01 02:00:00', user_id: 42, event_type: 'PURCHASE', version: 2 },
        ],
      },
    ],
    taskDescription:
      'В тренажере спроектируйте DDL-запрос создания таблицы аналитики в ClickHouse на движке `ReplacingMergeTree(version)`: укажите партиционирование по месяцам `PARTITION BY toYYYYMM(event_time)` и разреженный индекс `ORDER BY (tenant_id, event_time, user_id)`. Нажмите «Проверить конфигурацию».',
    seedCode: '',
    initialCode: `-- Создание таблицы на движке ReplacingMergeTree в ClickHouse:\nCREATE TABLE ch_events (\n    tenant_id UInt32,\n    event_time DateTime,\n    user_id UInt64,\n    event_type String,\n    version UInt64\n)\nENGINE = ReplacingMergeTree(version)\nPARTITION BY toYYYYMM(event_time)\nORDER BY (tenant_id, event_time, user_id);`,
    solutionCode: 'ENGINE = ReplacingMergeTree(version)\nPARTITION BY toYYYYMM(event_time)\nORDER BY (tenant_id, event_time, user_id)',
    testConfig: {
      checkOrder: false,
      floatPrecision: 2,
      requiredAstPatterns: ['ReplacingMergeTree', 'PARTITION BY', 'ORDER BY'],
    },
    brokenProdTask: {
      title: 'Авария: Слишком мелкое партиционирование (Too many parts)',
      incidentDescription:
        'P1 Incident: Таблица партиционирована по дням toYYYYMMDD() на истории в 10 лет. На диске создано 45 000 кусков, сервер упал.',
      buggyCode: 'PARTITION BY toYYYYMMDD(event_time)',
      fixHint: 'Смените ключ партиционирования на помесячный toYYYYMM(event_time) для сокращения количества кусков.',
      solutionCode: 'PARTITION BY toYYYYMM(event_time)',
      testConfig: { checkOrder: false, floatPrecision: 2 },
    },
    hints: [
      'Используйте ENGINE = ReplacingMergeTree(version).',
      'Задайте партиционирование по месяцам PARTITION BY toYYYYMM(event_time).',
      'Сформируйте ORDER BY от колонок с низкой кардинальностью к колонкам с высокой кардинальностью.',
    ],
  },
];
