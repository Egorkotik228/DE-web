import { Lesson } from '@/types/course';

export const sqlLesson1: Lesson = {
  id: 'sql-1',
  moduleSlug: 'sql',
  order: 1,
  title: 'Первые шаги в SQL: Что такое таблица, типы данных, SELECT, WHERE, ORDER BY и LIMIT',
  estimatedMinutes: 20,
  glossaryTerms: [
    {
      term: 'Реляционная таблица',
      definition: 'Двумерная структура данных из именованных столбцов с фиксированным типом и строк-кортежей.',
    },
    {
      term: 'Предикат (Predicate)',
      definition: 'Логическое выражение в секции WHERE, вычисляемое в TRUE, FALSE или UNKNOWN для каждой строки.',
    },
    {
      term: 'Алиас (Alias)',
      definition: 'Временный псевдоним таблицы или вычисляемого столбца, задаваемый ключевым словом AS.',
    },
    {
      term: 'SARGable предикат',
      definition: 'Условие фильтрации, позволяющее движку СУБД эффективно использовать B-Tree индекс напрямую.',
    },
  ],
  schemaPreview: [
    {
      tableName: 'orders',
      description: 'Сырые заказы интернет-магазина техники',
      columns: [
        { name: 'order_id', type: 'INT', keyType: 'PK' },
        { name: 'customer_name', type: 'VARCHAR(100)' },
        { name: 'category', type: 'VARCHAR(50)' },
        { name: 'unit_price', type: 'NUMERIC(10,2)' },
        { name: 'quantity', type: 'INT' },
        { name: 'order_date', type: 'VARCHAR(20)' },
      ],
      sampleRows: [
        { order_id: 101, customer_name: 'Иван', category: 'Electronics', unit_price: 700.0, quantity: 2, order_date: '2026-10-01 10:15:00' },
        { order_id: 102, customer_name: 'Анна', category: 'Electronics', unit_price: 599.99, quantity: 1, order_date: '2026-10-02 11:30:00' },
        { order_id: 103, customer_name: 'Олег', category: 'Furniture', unit_price: 850.0, quantity: 1, order_date: '2026-10-02 12:45:00' },
        { order_id: 104, customer_name: 'Мария', category: 'Electronics', unit_price: 250.0, quantity: 3, order_date: '2026-10-03 14:20:00' },
        { order_id: 105, customer_name: 'Сергей', category: 'Electronics', unit_price: 150.0, quantity: 1, order_date: '2026-10-03 16:00:00' },
      ],
    },
  ],
  theoryBlocks: [
    {
      type: 'markdown',
      content: `### Реляционная модель и базовый синтаксис SQL

В реляционных базах данных вся информация хранится в виде **таблиц**. Таблица состоит из именованных **колонок** (атрибутов) строго определенного типа и **строк** (записей).

#### Основные типы данных в SQL:
* \`INT\` / \`BIGINT\` — целые числа (счетчики, идентификаторы).
* \`VARCHAR(n)\` / \`TEXT\` — строковые данные переменной длины.
* \`NUMERIC(precision, scale)\` / \`DECIMAL\` — числа с фиксированной точкой для финансовых расчетов (защищает от ошибок округления \`FLOAT\`).
* \`TIMESTAMP\` / \`DATE\` — дата и время событий.
* \`BOOLEAN\` — логический тип (\`TRUE\` / \`FALSE\`).

#### Анатомия запроса: SELECT, WHERE, ORDER BY, LIMIT
Базовый запрос к таблице строится по схеме:
\`\`\`sql
SELECT column1, (unit_price * quantity) AS total_amount
FROM orders
WHERE category = 'Electronics' AND quantity >= 2
ORDER BY total_amount DESC
LIMIT 10;
\`\`\`

1. **\`SELECT\`:** Определяет, какие колонки вернуть клиенту. Здесь же можно вычислять новые поля (\`unit_price * quantity\`) и давать им понятные имена через \`AS total_amount\`.
2. **\`FROM\`:** Указывает таблицу-источник.
3. **\`WHERE\`:** Фильтрует строки до их выгрузки. Операторы: \`=\`, \`<>\`, \`>\`, \`<\`, \`>=\`, \`<=\`, \`BETWEEN a AND b\`, \`IN ('val1', 'val2')\`, \`LIKE 'prefix%'\`.
4. **Приоритет логических операторов:** Оператор \`AND\` имеет более высокий приоритет, чем \`OR\`! Условие \`A AND B OR C\` всегда вычисляется как \`(A AND B) OR C\`. Чтобы избежать утечек данных, всегда явно расставляйте скобки!
5. **\`ORDER BY\`:** Сортирует результат по одной или нескольким колонкам (\`ASC\` — по возрастанию, по умолчанию; \`DESC\` — по убыванию).
6. **\`LIMIT\`:** Ограничивает количество возвращаемых строк.`,
    },
    {
      type: 'callout',
      variant: 'analogy',
      title: '💡 На пальцах: Электронная таблица и складской конвейер',
      content: `Представьте таблицу как шкаф со строгими ячейками: в ячейку с биркой «ЦЕНА» физически невозможно положить текст «дорого». 

Когда вы пишете SQL-запрос, вы отдаете команду кладовщику: «Подойди к шкафу orders (FROM), отбери только коробки с электроникой дороже 500 рублей (WHERE), посчитай итоговый чек (SELECT total_amount), поставь самые дорогие наверх (ORDER BY) и отдай мне ровно 3 штуки (LIMIT 3)». Кладовщик не несет вам весь склад — он отдает только запрошенную выжимку.`,
    },
    {
      type: 'before-after-table',
      data: {
        title: 'Фильтрация сырых заказов и вычисление общей стоимости',
        beforeDescription: 'Сырые записи в таблице orders',
        beforeColumns: ['order_id', 'unit_price', 'quantity'],
        beforeRows: [
          ['101', '700.00', '2'],
          ['102', '599.99', '1'],
          ['104', '250.00', '3'],
        ],
        afterDescription: 'Выборка после расчета суммы, сортировки по убыванию и LIMIT 3',
        afterColumns: ['order_id', 'total_amount', 'order_date'],
        afterRows: [
          ['101', '1400.00', '2026-10-01 10:15:00'],
          ['104', '750.00', '2026-10-03 14:20:00'],
          ['102', '599.99', '2026-10-02 11:30:00'],
        ],
      },
    },
    {
      type: 'callout',
      variant: 'prod-danger',
      title: '⚠️ Грабли в проде: SELECT * без фильтра уронил прод-базу',
      content: `В крупном банке начинающий инженер запустил скрипт с \`SELECT * FROM transactions\` без \`LIMIT\`, чтобы быстро взглянуть на структуру данных. Таблица содержала 800 миллионов строк и 65 колонок (включая JSON-payloads). 

Запрос вызвал гигантский скан диска (Sequential Scan), вытеснил горячие данные из памяти сервера (Buffer Pool Cache) и парализовал боевой OLTP на 40 минут.

**Железное правило DE:** В продакшене всегда перечисляйте только нужные поля и ставьте \`LIMIT 100\` при исследовательских запросах!`,
    },
    {
      type: 'callout',
      variant: 'interview',
      title: '🎯 Спросят на собесе: Почему SELECT * категорически запрещен в production ETL?',
      content: `**Ответ:** 
1. **Сетевой оверхед и I/O:** СУБД вычитывает с диска и передает по сети терабайты лишних данных. В колоночных хранилищах (ClickHouse, BigQuery, Snowflake) запрос каждой лишней колонки увеличивает расходы компании.
2. **Ловушка сдвига схемы (Schema Drift):** Если в источнике добавят новую колонку или поменяют порядок, неявный SELECT * сломает пайплайн или запишет данные не в те поля витрины.
3. **Индексы:** Запрос конкретных столбцов позволяет СУБД использовать покрывающий индекс (Index-Only Scan) без чтения тела таблицы.`,
    },
  ],
  taskDescription: 'Напишите SQL-запрос к таблице orders, который:\n1. Выбирает номер заказа order_id.\n2. Рассчитывает общую сумму заказа (unit_price * quantity) с псевдонимом total_amount.\n3. Выбирает дату заказа order_date.\n4. Фильтрует только категорию Electronics (category = \'Electronics\'), для которой выполнено хотя бы одно условие: quantity >= 2 ИЛИ unit_price > 500.00 (обратите внимание на скобки в логике!).\n5. Сортирует результат по убыванию total_amount (DESC).\n6. Ограничивает выборку первыми 3 записями (LIMIT 3).',
  seedCode: `CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    customer_name VARCHAR(100),
    category VARCHAR(50),
    unit_price NUMERIC(10,2),
    quantity INT,
    order_date VARCHAR(20)
);

INSERT INTO orders VALUES
(101, 'Иван', 'Electronics', 700.00, 2, '2026-10-01 10:15:00'),
(102, 'Анна', 'Electronics', 599.99, 1, '2026-10-02 11:30:00'),
(103, 'Олег', 'Furniture', 850.00, 1, '2026-10-02 12:45:00'),
(104, 'Мария', 'Electronics', 250.00, 3, '2026-10-03 14:20:00'),
(105, 'Сергей', 'Electronics', 150.00, 1, '2026-10-03 16:00:00');`,
  initialCode: `-- Выберите order_id, рассчитайте total_amount, выберите order_date
-- Отфильтруйте категорию Electronics с (quantity >= 2 OR unit_price > 500.00)
-- Отсортируйте по total_amount DESC и ограничьте выборку 3 записями
SELECT 
    order_id,
    -- total_amount
    order_date
FROM orders
WHERE category = 'Electronics'
  -- дополните условие фильтрации
-- сортировка и лимит`,
  solutionCode: `SELECT 
    order_id,
    (unit_price * quantity) AS total_amount,
    order_date
FROM orders
WHERE category = 'Electronics'
  AND (quantity >= 2 OR unit_price > 500.00)
ORDER BY total_amount DESC
LIMIT 3;`,
  testConfig: {
    checkOrder: true,
    floatPrecision: 2,
    expectedRowCount: 3,
    expectedColumns: ['order_id', 'total_amount', 'order_date'],
  },
  brokenProdTask: {
    title: 'Инцидент #101: Утечка мебели в отчет по электронике из-за приоритета AND/OR',
    incidentDescription: 'Младший аналитик написал запрос без скобок: WHERE category = \'Electronics\' AND quantity >= 2 OR unit_price > 500.00. Из-за высшего приоритета AND в отчет попала дорогая мебель из категории Furniture с ценой > 500!',
    buggyCode: `SELECT 
    order_id,
    (unit_price * quantity) AS total_amount,
    order_date
FROM orders
WHERE category = 'Electronics' AND quantity >= 2 OR unit_price > 500.00
ORDER BY total_amount DESC
LIMIT 3;`,
    fixHint: 'Оберните блок альтернативных условий в скобки: AND (quantity >= 2 OR unit_price > 500.00).',
    solutionCode: `SELECT 
    order_id,
    (unit_price * quantity) AS total_amount,
    order_date
FROM orders
WHERE category = 'Electronics'
  AND (quantity >= 2 OR unit_price > 500.00)
ORDER BY total_amount DESC
LIMIT 3;`,
    testConfig: {
      checkOrder: true,
      floatPrecision: 2,
      expectedRowCount: 3,
    },
  },
  hints: [
    'Используйте выражение (unit_price * quantity) AS total_amount для вычисления стоимости заказа.',
    'Оператор AND выполняется раньше OR. Сгруппируйте альтернативные условия скобками: AND (quantity >= 2 OR unit_price > 500.00).',
    'Завершите запрос сортировкой ORDER BY total_amount DESC и ограничением LIMIT 3.',
  ],
};
