import { Lesson } from '@/types/course';

export const sqlLesson4: Lesson = {
  id: 'sql-4',
  moduleSlug: 'sql',
  order: 4,
  title: 'Условная логика и подзапросы с нуля: CASE WHEN, COALESCE, подзапросы и введение в CTE (WITH)',
  estimatedMinutes: 30,
  glossaryTerms: [
    {
      term: 'CASE выражение',
      definition: 'Условная конструкция в SQL (аналог if-else), возвращающая первое подходящее значение по принципу первого совпадения.',
    },
    {
      term: 'COALESCE',
      definition: 'Скалярная функция стандарта ANSI SQL, возвращающая первый аргумент из переданного списка, не равный NULL.',
    },
    {
      term: 'Подзапрос (Subquery)',
      definition: 'Запрос, вложенный внутрь другого SQL-запроса (в блоках SELECT, FROM или WHERE).',
    },
    {
      term: 'CTE (Common Table Expression)',
      definition: 'Именованное временное результирующее множество, определяемое с помощью конструкции WITH для построения читаемых конвейеров данных.',
    },
  ],
  schemaPreview: [
    {
      tableName: 'transactions',
      description: 'Транзакции клиентов платформы',
      columns: [
        { name: 'tx_id', type: 'INT', keyType: 'PK' },
        { name: 'customer_id', type: 'INT', keyType: 'FK' },
        { name: 'amount', type: 'NUMERIC(10,2)' },
        { name: 'status', type: 'VARCHAR(20)' },
      ],
      sampleRows: [
        { tx_id: 1, customer_id: 1, amount: 7500.0, status: 'completed' },
        { tx_id: 2, customer_id: 1, amount: 5000.0, status: 'completed' },
        { tx_id: 3, customer_id: 2, amount: 1800.0, status: 'completed' },
        { tx_id: 4, customer_id: 2, amount: 9000.0, status: 'cancelled' },
        { tx_id: 5, customer_id: 3, amount: 4200.0, status: 'completed' },
      ],
    },
  ],
  theoryBlocks: [
    {
      type: 'markdown',
      content: `### Условная логика и модульные конвейеры в SQL

В аналитических пайплайнах постоянно требуется категоризировать данные (например, присвоить клиенту статус лояльности VIP / Premium / Standard) и разбивать сложные многошаговые вычисления на читаемые блоки.

#### Конструкция CASE WHEN
\`\`\`sql
SELECT 
    customer_id,
    amount,
    CASE 
        WHEN amount >= 10000 THEN 'VIP'
        WHEN amount >= 3000 THEN 'Premium'
        ELSE 'Standard'
    END AS tier
FROM transactions;
\`\`\`

**Правило выполнения CASE:**
1. Проверка условий идет **строго сверху вниз** до первого истинного выражения (\`TRUE\`). Как только ветка сработала, остальные игнорируются (Short-circuit evaluation).
2. **Опасность забытого \`ELSE\`:** Если ни одно условие не подошло, а секция \`ELSE\` не указана, СУБД вернет **\`NULL\`**!

#### Функция COALESCE
Функция \`COALESCE(val1, val2, ..., default_val)\` возвращает первое значение, не равное \`NULL\`. Это надежная замена громоздкому \`CASE WHEN col IS NOT NULL THEN col ELSE 'default' END\`.

#### Введение в CTE (Common Table Expression, WITH)
Когда в запросе требуется сначала посчитать агрегаты, а затем применить к ним условную логику, классические подзапросы превращаются в нечитаемую «матрешку»:
\`\`\`sql
-- ❌ Плохо читаемый вложенный подзапрос:
SELECT customer_id, total_spent, CASE WHEN total_spent > 10000 THEN 'VIP' ELSE 'Standard' END
FROM (SELECT customer_id, SUM(amount) AS total_spent FROM transactions GROUP BY customer_id) sub;
\`\`\`

Конструкция \`WITH\` (CTE) превращает вложенность в пошаговый конвейер:
\`\`\`sql
-- ✅ Чистый, модульный конвейер через CTE:
WITH customer_totals AS (
    SELECT 
        customer_id,
        SUM(amount) AS total_spent
    FROM transactions
    WHERE status = 'completed'
    GROUP BY customer_id
)
SELECT 
    customer_id,
    total_spent,
    CASE 
        WHEN total_spent >= 10000 THEN 'VIP'
        WHEN total_spent >= 3000 THEN 'Premium'
        ELSE 'Standard'
    END AS tier
FROM customer_totals
ORDER BY total_spent DESC;
\`\`\``,
    },
    {
      type: 'callout',
      variant: 'analogy',
      title: '💡 На пальцах: Кулинарный рецепт и конвейерные лотки',
      content: `Попытка написать пятиэтажный вложенный подзапрос похожа на рецепт торта в одном предложении: «Возьмите крем из (взбейте сливки от (коров, которые паслись на (альпийских лугах...)))». Читать это больно и тяжело.

CTE (\`WITH\`) раскладывает рецепт по понятным лоткам:
1. Лоток 1: \`WITH fresh_cream AS (...)\` — подготовили сливки.
2. Лоток 2: \`, baked_cakes AS (...)\` — испекли коржи.
3. Финал: \`SELECT * FROM baked_cakes JOIN fresh_cream\` — собрали готовый торт.

Каждый шаг изолирован, понятен и легко тестируется отдельно.`,
    },
    {
      type: 'before-after-table',
      data: {
        title: 'Сегментация клиентов на когорты через CTE и CASE WHEN',
        beforeDescription: 'Суммарные успешные траты клиентов',
        beforeColumns: ['customer_id', 'total_spent', 'completed_tx_count'],
        beforeRows: [
          ['1', '12500.00', '2'],
          ['3', '4200.00', '1'],
          ['2', '1800.00', '1'],
        ],
        afterDescription: 'Финальный отчет с присвоением рангов клиентам',
        afterColumns: ['customer_id', 'total_spent', 'tier'],
        afterRows: [
          ['1', '12500.00', 'VIP'],
          ['3', '4200.00', 'Premium'],
          ['2', '1800.00', 'Standard'],
        ],
      },
    },
    {
      type: 'callout',
      variant: 'prod-danger',
      title: '⚠️ Грабли в проде: Инверсия условий в CASE WHEN сломала программу лояльности',
      content: `Разработчик написал сегментацию:
\`\`\`sql
CASE 
    WHEN total_spent >= 3000 THEN 'Premium'
    WHEN total_spent >= 10000 THEN 'VIP'
END
\`\`\`
Поскольку проверка идет сверху вниз, клиент с чеком 50 000 руб попал под первое условие \`>= 3000\` и получил статус 'Premium'! А клиенты с чеком до 3000 получили \`NULL\` из-за отсутствия \`ELSE\`, что вызвало падение биллинга.`,
    },
    {
      type: 'callout',
      variant: 'interview',
      title: '🎯 Спросят на собесе: Чем CTE отличается от обычного подзапроса?',
      content: `**Ответ:** 
1. **Читаемость и архитектура:** Запрос читается сверху вниз как последовательный ETL-пайплайн.
2. **Повторное использование:** К одному и тому же CTE можно обращаться несколько раз в рамках запроса (в JOIN, WHERE, UNION).
3. **Рекурсия:** Только через \`WITH RECURSIVE\` возможно строить обход графов и древовидных структур.
4. **Оптимизация:** В современных версиях СУБД (PostgreSQL 12+, ClickHouse, SQLite) нерекурсивные CTE инлайнятся оптимизатором так же эффективно, как и подзапросы.`,
    },
  ],
  taskDescription: 'Постройте двухшаговый отчет сегментации клиентов с использованием CTE (WITH) и условной логики CASE WHEN:\n1. Создайте CTE с именем customer_spending, который для каждого клиента (customer_id) рассчитывает общую сумму успешных платежей SUM(amount) как total_spent строго для транзакций со статусом completed (WHERE status = \'completed\').\n2. В основном запросе выберите customer_id, total_spent и с помощью CASE WHEN сформируйте колонку tier по следующим правилам:\n   - Если total_spent >= 10000.00 — \'VIP\'\n   - Если total_spent >= 3000.00 — \'Premium\'\n   - Во всех остальных случаях — \'Standard\' (обязательно укажите ELSE!)\n3. Отсортируйте итоговый отчет по total_spent DESC.',
  seedCode: `CREATE TABLE transactions (
    tx_id INT PRIMARY KEY,
    customer_id INT,
    amount NUMERIC(10,2),
    status VARCHAR(20)
);

INSERT INTO transactions VALUES
(1, 1, 7500.00, 'completed'),
(2, 1, 5000.00, 'completed'),
(3, 2, 1800.00, 'completed'),
(4, 2, 9000.00, 'cancelled'),
(5, 3, 4200.00, 'completed'),
(6, 4, 500.00, 'failed');`,
  initialCode: `-- Шаг 1: Определите CTE customer_spending
WITH customer_spending AS (
    SELECT 
        customer_id,
        -- посчитайте total_spent по статусу completed
    FROM transactions
    -- WHERE, GROUP BY
)
-- Шаг 2: Основной запрос с сегментацией через CASE WHEN
SELECT 
    customer_id,
    total_spent,
    -- CASE WHEN total_spent >= 10000.00 ... AS tier
FROM customer_spending
ORDER BY total_spent DESC;`,
  solutionCode: `WITH customer_spending AS (
    SELECT 
        customer_id,
        SUM(amount) AS total_spent
    FROM transactions
    WHERE status = 'completed'
    GROUP BY customer_id
)
SELECT 
    customer_id,
    total_spent,
    CASE 
        WHEN total_spent >= 10000.00 THEN 'VIP'
        WHEN total_spent >= 3000.00 THEN 'Premium'
        ELSE 'Standard'
    END AS tier
FROM customer_spending
ORDER BY total_spent DESC;`,
  testConfig: {
    checkOrder: true,
    floatPrecision: 2,
    expectedRowCount: 3,
    expectedColumns: ['customer_id', 'total_spent', 'tier'],
  },
  brokenProdTask: {
    title: 'Инцидент #104: Ошибочные статусы лояльности из-за инверсии условий в CASE WHEN',
    incidentDescription: 'В отчете лояльности клиенты с тратами свыше 10000 рублей получили статус Premium вместо VIP, потому что условие >= 3000 стояло первым в секции CASE WHEN.',
    buggyCode: `WITH customer_spending AS (
    SELECT 
        customer_id,
        SUM(amount) AS total_spent
    FROM transactions
    WHERE status = 'completed'
    GROUP BY customer_id
)
SELECT 
    customer_id,
    total_spent,
    CASE 
        WHEN total_spent >= 3000.00 THEN 'Premium'
        WHEN total_spent >= 10000.00 THEN 'VIP'
        ELSE 'Standard'
    END AS tier
FROM customer_spending
ORDER BY total_spent DESC;`,
    fixHint: 'Поменяйте порядок условий: более узкое и строгое условие (>= 10000.00) должно проверяться раньше, чем общее (>= 3000.00).',
    solutionCode: `WITH customer_spending AS (
    SELECT 
        customer_id,
        SUM(amount) AS total_spent
    FROM transactions
    WHERE status = 'completed'
    GROUP BY customer_id
)
SELECT 
    customer_id,
    total_spent,
    CASE 
        WHEN total_spent >= 10000.00 THEN 'VIP'
        WHEN total_spent >= 3000.00 THEN 'Premium'
        ELSE 'Standard'
    END AS tier
FROM customer_spending
ORDER BY total_spent DESC;`,
    testConfig: {
      checkOrder: true,
      floatPrecision: 2,
      expectedRowCount: 3,
    },
  },
  hints: [
    'Сначала в CTE сгруппируйте транзакции по customer_id и посчитайте сумму с условием WHERE status = \'completed\'.',
    'В конструкции CASE WHEN всегда проверяйте сначала максимальный порог (>= 10000.00), затем средний (>= 3000.00), а в ELSE укажите \'Standard\'.',
    'Не забудьте закрыть блок ключевым словом END AS tier и отсортировать результат по total_spent DESC.',
  ],
};
