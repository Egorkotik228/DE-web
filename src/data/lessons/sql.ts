import { Lesson } from '@/types/course';

export const sqlLessons: Lesson[] = [
  {
    id: 'sql-1',
    moduleSlug: 'sql',
    order: 1,
    title: 'Логический порядок выполнения SQL и ловушки троичной логики NULL',
    estimatedMinutes: 30,
    glossaryTerms: [
      { term: '3VL', definition: 'Three-Valued Logic — логическая система стандарта SQL с тремя значениями: TRUE, FALSE и UNKNOWN.' },
      { term: 'Predicate Pushdown', definition: 'Оптимизация СУБД, при которой условия фильтрации проталкиваются как можно ближе к источнику данных.' },
      { term: 'SARGable', definition: 'Search Argument Able — предикат, который может использовать B-Tree индекс напрямую без вычисления функций от колонки.' },
    ],
    schemaPreview: [
      {
        tableName: 'employees',
        description: 'Сотрудники компании и их отделы',
        columns: [
          { name: 'emp_id', type: 'INT', keyType: 'PK' },
          { name: 'name', type: 'VARCHAR(100)' },
          { name: 'dept_id', type: 'INT', keyType: 'FK' },
          { name: 'salary', type: 'NUMERIC(10,2)' },
          { name: 'manager_id', type: 'INT' },
        ],
        sampleRows: [
          { emp_id: 1, name: 'Анна', dept_id: 10, salary: 250000.00, manager_id: null },
          { emp_id: 2, name: 'Борис', dept_id: 10, salary: 180000.00, manager_id: 1 },
          { emp_id: 3, name: 'Виктор', dept_id: 20, salary: 140000.00, manager_id: 1 },
          { emp_id: 4, name: 'Галина', dept_id: null, salary: 190000.00, manager_id: null },
        ],
      },
    ],
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Что происходит в движке SQL: Лексический vs Логический порядок

Разработчик пишет SQL-запрос начиная со слова \`SELECT\`:
\`\`\`sql
SELECT dept_id, AVG(salary) AS avg_sal
FROM employees
WHERE salary > 100000
GROUP BY dept_id
HAVING AVG(salary) > 150000
ORDER BY avg_sal DESC;
\`\`\`

Однако реляционный движок (Query Engine) выполняет фазы в принципиально ином, строго детерминированном **логическом порядке**:

1. **\`FROM\` и \`JOIN\` (+ \`ON\`):** Определяются таблицы-источники. Вычисляются декартовы произведения и применяются условия соединения строк.
2. **\`WHERE\`:** Строгая фильтрация строк ДО группировки. *Критически важно:* секция WHERE не видит псевдонимы (aliases), объявленные в SELECT, и не может использовать агрегатные функции (\`AVG\`, \`SUM\`), потому что группы еще не сформированы!
3. **\`GROUP BY\`:** Оставшиеся строки сжимаются в группы по уникальным ключам.
4. **\`HAVING\`:** Фильтрация уже сгруппированных данных по результатам агрегатных выражений.
5. **\`SELECT\`:** Вычисляются финальные скалярные выражения, выражения колонок и присваиваются псевдонимы (AS).
6. **\`WINDOW\`:** Если есть оконные функции (\`OVER\`), они рассчитываются ровно здесь.
7. **\`DISTINCT\`:** Удаляются полные дубликаты строк.
8. **\`ORDER BY\`:** Сортировка результирующего набора. Она исполняется ПОСЛЕ SELECT, поэтому законно видит псевдоним \`avg_sal\`.
9. **\`LIMIT\` / \`OFFSET\`:** Отрезается нужное число строк для отправки клиенту.

#### Троичная логика (Three-Valued Logic) и ловушка NULL
В реляционной теории \`NULL\` — это не ноль, не пустая строка \`""\` и не значение. **\`NULL\` означает «неизвестность» (Unknown).**

Поэтому выражение \`NULL = NULL\` возвращает **НЕ TRUE**, а **UNKNOWN**! Если вы не знаете рост Ивана и не знаете рост Петра, вы не можете утверждать, что их рост одинаков.

В секции \`WHERE\` строка попадает в результат ТОЛЬКО если итоговый предикат истинен: \`EVAL(predicate) === TRUE\`. Если результат \`FALSE\` или \`UNKNOWN\` — строка отбрасывается.

#### Самая частая авария в SQL: NOT IN с подзапросом, содержащим NULL
Рассмотрим запрос:
\`\`\`sql
SELECT * FROM employees 
WHERE manager_id NOT IN (SELECT manager_id FROM employees);
\`\`\`
Если в подзапросе среди менеджеров окажется хотя бы ОДНО значение \`NULL\`, предикат разворачивается движком как:
\`manager_id != 1 AND manager_id != 2 AND manager_id != NULL\`.
Так как любое сравнение с NULL дает \`UNKNOWN\`, все выражение принимает вид:
\`TRUE AND TRUE AND UNKNOWN\` -> **\`UNKNOWN\`**.
В итоге весь внешний запрос вернет ровно **0 строк**!`,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Ресторан и шеф-повар',
        content: `Представьте, что вы пришли в ресторан и делаете заказ (это ваш \`SELECT\`). 
Вы говорите официанту: «Принесите мне стейк средней прожарки, порезанный на слайсы (\`SELECT\`), только из мраморной говядины (\`WHERE\`), посыпанный розмарином».

Повар на кухне не начинает со слайсирования (SELECT)!
Сначала он идет на склад за мясом (\`FROM\`), отбирает только куски мраморной говядины (\`WHERE\`), жарит их на гриле (\`GROUP BY\`), проверяет готовность термометром (\`HAVING\`), и только перед самой подачей нарезает на красивые слайсы (\`SELECT\`) и раскладывает на тарелке по порядку (\`ORDER BY\`).`,
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Пропавшие клиенты из-за NOT IN (NULL)',
        content: `Реальный кейс финтеха: маркетинг запустил рассылку с бонусами клиентам, которые не совершали переводов мошенникам:
\`\`\`sql
-- ❌ В таблице fraud_targets была одна строка с client_id = NULL
SELECT client_id FROM clients 
WHERE client_id NOT IN (SELECT client_id FROM fraud_targets);
\`\`\`
Результат: запрос вернул 0 строк. Бонусы не получил никто, акция была сорвана.

**Железное правило DE:** Забудьте конструкцию \`NOT IN (subquery)\`. Всегда используйте безопасный \`NOT EXISTS\`:
\`\`\`sql
-- ✅ Безопасно, использует 2-значную логику и работает с индексами:
SELECT c.client_id FROM clients c
WHERE NOT EXISTS (
    SELECT 1 FROM fraud_targets f WHERE f.client_id = c.client_id
);
\`\`\``,
      },
      {
        type: 'callout',
        variant: 'interview',
        title: '🎯 Спросят на собесе: Почему нельзя использовать псевдоним из SELECT в секции WHERE?',
        content: `**Ответ:** Потому что на логическом этапе работы оптимизатора секция \`WHERE\` выполняется ДО секции \`SELECT\`. Когда планировщик фильтрует строки таблицы, псевдонимы колонок (aliases) еще даже не существуют в памяти процесса. 

Исключение в некоторых СУБД (например, ClickHouse или Snowflake) допускает использование алиасов в WHERE благодаря синтаксическому сахару парсера, но по стандарту ANSI SQL это запрещено.`,
      },
    ],
    taskDescription: `Напишите запрос, который находит отделы ('dept_id'), где средняя зарплата сотрудников ('AVG(salary)') строго выше 150000. В расчет должны попадать только сотрудники, у которых указан отдел ('dept_id IS NOT NULL'). Выведите 'dept_id', среднюю зарплату с округлением до 2 знаков как 'avg_salary' и число сотрудников в отделе как 'emp_count'. Отсортируйте по 'avg_salary' по убыванию.`,
    seedCode: `CREATE TABLE employees (
    emp_id INT PRIMARY KEY,
    name VARCHAR(100),
    dept_id INT,
    salary NUMERIC(10,2),
    manager_id INT
);

INSERT INTO employees VALUES
(1, 'Анна', 10, 250000.00, NULL),
(2, 'Борис', 10, 180000.00, 1),
(3, 'Виктор', 20, 140000.00, 1),
(4, 'Галина', NULL, 190000.00, NULL),
(5, 'Дмитрий', 20, 130000.00, 3),
(6, 'Елена', 30, 300000.00, 1);`,
    initialCode: `-- Напишите агрегатный запрос с HAVING
SELECT 
    dept_id,
    -- avg_salary
    -- emp_count
FROM employees
-- WHERE, GROUP BY, HAVING, ORDER BY`,
    solutionCode: `SELECT 
    dept_id,
    ROUND(AVG(salary), 2) AS avg_salary,
    COUNT(*) AS emp_count
FROM employees
WHERE dept_id IS NOT NULL
GROUP BY dept_id
HAVING AVG(salary) > 150000
ORDER BY avg_salary DESC;`,
    testConfig: {
      checkOrder: true,
      floatPrecision: 2,
      expectedRowCount: 2,
      expectedColumns: ['dept_id', 'avg_salary', 'emp_count'],
    },
    brokenProdTask: {
      title: 'Инцидент #106: Попытка фильтрации агрегата в WHERE уронила ETL',
      incidentDescription: 'Младший разработчик попытался отфильтровать сумму в секции WHERE, из-за чего упал ежедневный расчет бонусов с синтаксической ошибкой: aggregate functions are not allowed in WHERE.',
      buggyCode: `SELECT 
    dept_id,
    AVG(salary) as avg_sal
FROM employees
WHERE dept_id IS NOT NULL AND AVG(salary) > 150000
GROUP BY dept_id;`,
      fixHint: 'Перенесите фильтрацию агрегатной функции AVG(salary) из секции WHERE в секцию HAVING.',
      solutionCode: `SELECT 
    dept_id,
    ROUND(AVG(salary), 2) as avg_sal
FROM employees
WHERE dept_id IS NOT NULL
GROUP BY dept_id
HAVING AVG(salary) > 150000;`,
      testConfig: {
        checkOrder: false,
        floatPrecision: 2,
      },
    },
    hints: [
      'Фильтрация строк до агрегации (dept_id IS NOT NULL) идет в WHERE.',
      'Группировка по dept_id идет в GROUP BY, а фильтрация вычисленного AVG(salary) > 150000 — строго в HAVING.',
      'Не забудьте псевдонимы колонок через AS: avg_salary и emp_count.',
    ],
  },
  {
    id: 'sql-2',
    moduleSlug: 'sql',
    order: 2,
    title: 'Оконные функции и фреймы: ROWS BETWEEN против RANGE BETWEEN',
    estimatedMinutes: 35,
    glossaryTerms: [
      { term: 'Window Frame', definition: 'Оконный фрейм — подмножество строк внутри текущей партиции, используемое для вычисления значения агрегатной функции для текущей строки.' },
      { term: 'Peers', definition: 'Строки-дубликаты, имеющие абсолютно одинаковые значения в колонках сортировки ORDER BY оконного выражения.' },
      { term: 'Deduplication', definition: 'Процесс устранения дублирующихся записей для гарантии уникальности первичного ключа.' },
    ],
    schemaPreview: [
      {
        tableName: 'daily_revenue',
        description: 'Ежедневная выручка по магазинам сети',
        columns: [
          { name: 'store_id', type: 'INT' },
          { name: 'sale_date', type: 'DATE' },
          { name: 'revenue', type: 'NUMERIC(10,2)' },
        ],
        sampleRows: [
          { store_id: 1, sale_date: '2026-10-01', revenue: 10000.00 },
          { store_id: 1, sale_date: '2026-10-02', revenue: 15000.00 },
          { store_id: 1, sale_date: '2026-10-03', revenue: 12000.00 },
          { store_id: 2, sale_date: '2026-10-01', revenue: 8000.00 },
        ],
      },
    ],
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Анатомия оконного фрейма: как движок считает скользящие агрегаты

В отличие от классического \`GROUP BY\`, который схлопывает несколько строк в одну, **оконная функция (Window Function)** сохраняет индивидуальность каждой строки, приписывая к ней результат расчета по определенному окну.

Конструкция оконной функции состоит из трех ключевых частей:
\`\`\`sql
FUNCTION() OVER (
    PARTITION BY store_id 
    ORDER BY sale_date 
    [FRAME_SPECIFICATION]
)
\`\`\`

1. **\`PARTITION BY\`:** Делит исходный массив на изолированные карманы (партиции). Расчет функции никогда не выходит за границы своей партиции.
2. **\`ORDER BY\`:** Сортирует строки внутри партиции, определяя последовательность движения курсора расчета.
3. **\`FRAME_SPECIFICATION\` (Оконный фрейм):** Самая тонкая часть, порождающая 80% скрытых багов в аналитике.

#### Битва гигантов: ROWS против RANGE
Стандарт ANSI SQL поддерживает два режима определения границ фрейма:

* **\`ROWS BETWEEN\` (Физические строки):**
  Оперирует строгим количеством физических строк до и после текущей.
  \`\`\`sql
  -- Скользящее среднее строго по текущей строке и 2 предшествующим физическим записям:
  AVG(revenue) OVER (
      PARTITION BY store_id
      ORDER BY sale_date
      ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
  )
  \`\`\`

* **\`RANGE BETWEEN\` (Логический диапазон значений):**
  Оперирует не строками, а **значениями** колонки из \`ORDER BY\`. Если несколько строк имеют одинаковое значение даты (так называемые **peers**), RANGE включит их ВСЕ в расчет фрейма одновременно!

#### Скрытая ловушка дефолтного фрейма
Если вы написали в запросе:
\`\`\`sql
SUM(revenue) OVER (PARTITION BY store_id ORDER BY sale_date)
\`\`\`
Стандарт SQL неявно подставляет дефолтный фрейм:
\`\`\`sql
RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
\`\`\`
Если в данных есть две строки с одинаковой датой \`sale_date\`, обе строки получат **одинаковую сумму**, равную кумулятивному итогу на конец этого дня, вместо последовательного нарастания! Кроме того, RANGE работает значительно медленнее ROWS, так как вынужден материализовать группы дубликатов в памяти.

#### Эталонный паттерн дедупликации через ROW_NUMBER()
В хранилищах данных сырые события часто дублируются из-за повторных сетевых отправок. Золотой стандарт очистки дублей:
\`\`\`sql
WITH ranked_events AS (
    SELECT 
        event_id,
        payload,
        updated_at,
        ROW_NUMBER() OVER (
            PARTITION BY event_id 
            ORDER BY updated_at DESC
        ) AS rn
    FROM raw_events
)
SELECT event_id, payload, updated_at
FROM ranked_events
WHERE rn = 1;
\`\`\``,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Очередь за билетами',
        content: `Представьте очередь в кассу кинотеатра:
- **\`ROWS BETWEEN 1 PRECEDING AND CURRENT ROW\`**: Кассир смотрит на вас и на человека, стоящего ровно перед вами физически в очереди. Всегда ровно 2 человека.
- **\`RANGE BETWEEN CURRENT ROW AND CURRENT ROW\`**: Кассир смотрит на людей с абсолютно одинаковым временем прихода. Если вы пришли в 18:00 с тремя друзьями одновременно, кассир посчитает всю вашу компанию как единое целое.`,
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: RANK() вместо ROW_NUMBER() задвоил выплаты',
        content: `Разработчик выполнял дедупликацию транзакций по \`transaction_id\`, но вместо \`ROW_NUMBER()\` использовал функцию \`RANK()\`:
\`\`\`sql
-- ❌ При двух полных дубликатах с одинаковым timestamp RANK() присвоит обоим rn = 1!
SELECT * FROM (
    SELECT *, RANK() OVER (PARTITION BY tx_id ORDER BY created_at DESC) as rk
    FROM transactions
) WHERE rk = 1;
\`\`\`
Обе строки-дубликата получили ранг 1 и прошли в таблицу выплат, вызвав двойное списание средств клиентам.
        
**Правило:** Для строгой дедупликации (ровно одна строка на ключ) используется исключительно **\`ROW_NUMBER()\`**!`,
      },
      {
        type: 'callout',
        variant: 'interview',
        title: '🎯 Спросят на собесе: В чем разница между ROW_NUMBER, RANK и DENSE_RANK?',
        content: `Если мы ранжируем зарплаты [100k, 80k, 80k, 50k]:
1. **\`ROW_NUMBER()\`**: [1, 2, 3, 4] — гарантирует строго непрерывные уникальные целые числа без повторов.
2. **\`RANK()\`**: [1, 2, 2, 4] — дубликаты получают одинаковый ранг, но следующий номер идет **с пропуском** (дырой в нумерации).
3. **\`DENSE_RANK()\`**: [1, 2, 2, 3] — «плотный» ранг: дубликаты получают одинаковый номер, но следующий номер идет **без пропуска**.`,
      },
    ],
    taskDescription: `Для таблицы 'daily_revenue' рассчитайте скользящее среднее выручки (по физическим строкам: текущий день и 2 предшествующих дня) для магазина store_id = 1. Выведите 'sale_date', 'revenue' и вычисленное поле 'moving_avg_3d', округленное до 2 знаков после запятой. Отсортируйте результат по 'sale_date' по возрастанию.`,
    seedCode: `CREATE TABLE daily_revenue (
    store_id INT,
    sale_date DATE,
    revenue NUMERIC(10,2)
);

INSERT INTO daily_revenue VALUES
(1, '2026-10-01', 10000.00),
(1, '2026-10-02', 20000.00),
(1, '2026-10-03', 15000.00),
(1, '2026-10-04', 30000.00),
(1, '2026-10-05', 25000.00),
(2, '2026-10-01', 50000.00);`,
    initialCode: `-- Рассчитайте скользящее среднее по фрейму ROWS
SELECT 
    sale_date,
    revenue,
    -- moving_avg_3d
FROM daily_revenue
WHERE store_id = 1
ORDER BY sale_date;`,
    solutionCode: `SELECT 
    sale_date,
    revenue,
    ROUND(AVG(revenue) OVER (
        ORDER BY sale_date 
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ), 2) AS moving_avg_3d
FROM daily_revenue
WHERE store_id = 1
ORDER BY sale_date ASC;`,
    testConfig: {
      checkOrder: true,
      floatPrecision: 2,
      expectedRowCount: 5,
      expectedColumns: ['sale_date', 'revenue', 'moving_avg_3d'],
    },
    brokenProdTask: {
      title: 'Инцидент #107: Зависание аналитического отчета из-за RANGE фрейма',
      incidentDescription: 'Запрос скользящего среднего на таблице в 10 миллионов строк выполнялся 40 минут из-за использования тяжелого RANGE фрейма по неиндексированной колонке вместо легкого ROWS фрейма.',
      buggyCode: `SELECT 
    sale_date,
    revenue,
    AVG(revenue) OVER (
        ORDER BY sale_date 
        RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) as running_total
FROM daily_revenue;`,
      fixHint: 'Замените логический RANGE фрейм на физический ROWS фрейм.',
      solutionCode: `SELECT 
    sale_date,
    revenue,
    ROUND(AVG(revenue) OVER (
        ORDER BY sale_date 
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ), 2) as running_total
FROM daily_revenue;`,
      testConfig: {
        checkOrder: false,
        floatPrecision: 2,
      },
    },
    hints: [
      'Для расчета скользящего среднего используйте агрегатную функцию AVG(revenue) OVER (...).',
      'Оконный фрейм для текущей и двух предыдущих строк: ROWS BETWEEN 2 PRECEDING AND CURRENT ROW.',
      'Округлите результат через ROUND(..., 2) и присвойте алиас moving_avg_3d.',
    ],
  },
  {
    id: 'sql-3',
    moduleSlug: 'sql',
    order: 3,
    title: 'Сложные соединения: Коррелированные выборки, LATERAL-логика и предотвращение декартова взрыва',
    estimatedMinutes: 35,
    glossaryTerms: [
      { term: 'Cartesian Product', definition: 'Декартово произведение — комбинация каждой строки первой таблицы с каждой строкой второй (N × M строк), возникающая при отсутствии условий соединения.' },
      { term: 'Fan-out Effect', definition: 'Непреднамеренное лавинообразное размножение строк ведущей таблицы при неаккуратном соединении типа 1:N с несколькими дочерними сущностями.' },
      { term: 'Correlated Subquery', definition: 'Коррелированный подзапрос — вложенный запрос, который ссылается на значения текущей строки внешнего запроса и вычисляется для каждой строки отдельно.' },
      { term: 'LATERAL JOIN', definition: 'Конструкция ANSI SQL, позволяющая подзапросу в секции FROM ссылаться на колонки таблиц, объявленных левее (for-each цикл в SQL).' },
      { term: 'Nested Loop Join', definition: 'Физический алгоритм соединения, при котором для каждой строки ведущей таблицы (Outer) последовательно сканируется ведомая таблица (Inner).' },
    ],
    schemaPreview: [
      {
        tableName: 'clients',
        description: 'Справочник клиентов платформы',
        columns: [
          { name: 'client_id', type: 'INT', keyType: 'PK' },
          { name: 'name', type: 'VARCHAR(50)' },
        ],
        sampleRows: [
          { client_id: 1, name: 'Анна' },
          { client_id: 2, name: 'Борис' },
          { client_id: 3, name: 'Виктор' },
          { client_id: 4, name: 'Галина' },
        ],
      },
      {
        tableName: 'orders',
        description: 'Заказы клиентов в интернет-магазине',
        columns: [
          { name: 'order_id', type: 'INT', keyType: 'PK' },
          { name: 'client_id', type: 'INT', keyType: 'FK' },
          { name: 'amount', type: 'NUMERIC(10,2)' },
          { name: 'status', type: 'VARCHAR(20)' },
          { name: 'order_date', type: 'DATE' },
        ],
        sampleRows: [
          { order_id: 101, client_id: 1, amount: 5000.00, status: 'completed', order_date: '2026-10-10' },
          { order_id: 102, client_id: 1, amount: 3000.00, status: 'completed', order_date: '2026-10-15' },
          { order_id: 103, client_id: 1, amount: 1500.00, status: 'cancelled', order_date: '2026-10-20' },
          { order_id: 104, client_id: 2, amount: 8000.00, status: 'completed', order_date: '2026-10-12' },
          { order_id: 105, client_id: 3, amount: 2000.00, status: 'cancelled', order_date: '2026-10-14' },
        ],
      },
      {
        tableName: 'cashbacks',
        description: 'Начисления бонусных баллов кешбэка',
        columns: [
          { name: 'cashback_id', type: 'INT', keyType: 'PK' },
          { name: 'client_id', type: 'INT', keyType: 'FK' },
          { name: 'points', type: 'INT' },
        ],
        sampleRows: [
          { cashback_id: 201, client_id: 1, points: 100 },
          { cashback_id: 202, client_id: 1, points: 150 },
          { cashback_id: 203, client_id: 2, points: 50 },
          { cashback_id: 204, client_id: 4, points: 300 },
        ],
      },
    ],
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Физика соединений: как СУБД объединяет данные и почему возникает Fan-out

При выполнении соединений (\`JOIN\`) оптимизатор запросов СУБД выбирает один из трех базовых алгоритмов выполнения:

1. **Nested Loop Join:** Классический двойной цикл. Берется строка из первой таблицы, и во второй ищется совпадение (идеально, если во второй таблице есть B-Tree индекс). Сложность: $O(N \\times \\log M)$.
2. **Hash Join:** По меньшей таблице в оперативной памяти (\`work_mem\`) строится хэш-таблица по ключу соединения, затем большая таблица сканируется в один проход. Сложность: $O(N + M)$.
3. **Sort Merge Join:** Обе таблицы предварительно сортируются по ключу соединения, после чего соединяются параллельным движением двух указателей. Сложность: $O(N \\log N + M \\log M)$.

#### Проблема Декартова взрыва (Fan-out Effect)
Одна из самых коварных ловушек для дата-инженера — объединение одной сущности типа «один» сразу с двумя независимыми таблицами типа «многие» (\`1:N\` и \`1:M\`).

Представьте:
* У клиента **Анны** есть **2 успешных заказа** на суммы 5000 руб и 3000 руб (итого 8000 руб).
* У Анны также есть **2 начисления кешбэка** на 100 и 150 баллов (итого 250 баллов).

Если разработчик пишет наивный запрос:
\`\`\`sql
-- ❌ КАТАСТРОФИЧЕСКАЯ ОШИБКА ДЕКАРТОВА УМНОЖЕНИЯ:
SELECT 
    c.name,
    SUM(o.amount) AS total_spent,
    SUM(cb.points) AS total_cashback
FROM clients c
LEFT JOIN orders o ON c.client_id = o.client_id
LEFT JOIN cashbacks cb ON c.client_id = cb.client_id
GROUP BY c.name;
\`\`\`

Что происходит под капотом реляционного движка?
Движок соединяет 2 строки заказов с 2 строками кешбэка, порождая $2 \\times 2 = 4$ промежуточных строки!
В результате сумма заказов посчитается как $(5000 + 3000) \\times 2 = \\mathbf{16\\,000}$ руб (задвоение!), а кешбэк как $(100 + 150) \\times 2 = \\mathbf{500}$ баллов (тоже задвоение!).

#### Решение: Предварительная агрегация перед соединением
Золотое правило Data Engineering: **никогда не соединяйте несколько таблиц фактов напрямую без предварительного сжатия (агрегации) до уровня уникального бизнес-ключа!**

Используйте изолированные CTE:
\`\`\`sql
WITH agg_orders AS (
    SELECT client_id, SUM(amount) AS total_spent, MAX(order_date) AS last_order_date
    FROM orders
    WHERE status = 'completed'
    GROUP BY client_id
),
agg_cashback AS (
    SELECT client_id, SUM(points) AS total_cashback
    FROM cashbacks
    GROUP BY client_id
)
SELECT 
    c.name AS client_name,
    COALESCE(o.total_spent, 0.00) AS total_spent,
    COALESCE(cb.total_cashback, 0) AS total_cashback,
    o.last_order_date
FROM clients c
LEFT JOIN agg_orders o ON c.client_id = o.client_id
LEFT JOIN agg_cashback cb ON c.client_id = cb.client_id
ORDER BY total_spent DESC, client_name ASC;
\`\`\``,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Ресторанный чек и чаевые',
        content: `Представьте, что вы заказали в ресторане 2 пиццы и оставили чаевые 2 раза (официанту и баристе).
Если бухгалтер посчитает сумму чека, соединив каждую пиццу с каждым чаевым, он умножит цену каждой пиццы на 2 и чаевые на 2. 
Чтобы получить реальную сумму расходов, нужно сначала сложить стоимость всех пицц в один чек (первый CTE), затем сложить все чаевые (второй CTE), и только потом свести их в итоговую строку клиента.`,
      },
      {
        type: 'before-after-table',
        data: {
          title: 'Иллюстрация декартова размножения строк при наивном JOIN',
          beforeDescription: 'Сырые данные: 2 заказа (5000 + 3000) и 2 кешбэка (100 + 150)',
          beforeColumns: ['client', 'order_amount', 'cashback_points'],
          beforeRows: [
            ['Анна', 5000, 100],
            ['Анна', 3000, 150],
          ],
          afterDescription: 'Результат наивного JOIN: Декартов взрыв 2 × 2 = 4 строки, суммы задвоены!',
          afterColumns: ['client', 'order_id', 'amount', 'cashback_id', 'points'],
          afterRows: [
            ['Анна', 101, 5000, 201, 100],
            ['Анна', 101, 5000, 202, 150],
            ['Анна', 102, 3000, 201, 100],
            ['Анна', 102, 3000, 202, 150],
          ],
          highlightDiffIndices: [
            { row: 1, col: 2 },
            { row: 3, col: 2 },
          ],
        },
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Задвоение выручки на 1.2 млрд рублей в финтех-отчете',
        content: `В крупном маркетплейсе аналитик написал витрину для генерального директора, соединив таблицу \`orders\` с таблицей \`order_deliveries\` (у одного заказа могло быть 2 попытки доставки). 
В результате сумма всех оплат по заказам с несколькими курьерами удвоилась. Отчет показал квартальный оборот 2.4 млрд вместо реальных 1.2 млрд. Ошибку заметили только во время аудита налоговой отчетности.

**Решение:** Всегда проверяйте кардинальность соединения: если соединяете таблицу с отношением 1:N, обязательно сжимайте правую таблицу через \`GROUP BY\` до соединения!`,
      },
      {
        type: 'callout',
        variant: 'interview',
        title: '🎯 Спросят на собесе: Что такое LATERAL JOIN и чем он отличается от обычного подзапроса?',
        content: `**Ответ:** По стандарту SQL подзапрос в секции \`FROM\` изолирован и не может видеть колонки соседних таблиц в том же \`FROM\`. 
Конструкция \`LATERAL\` снимает это ограничение. Она работает как цикл **for-each** на уровне движка: для каждой строки внешней таблицы подзапрос выполняется заново с подстановкой параметров текущей строки. 
Это особенно мощно для задач вида: «выбрать топ-3 последних события для КАЖДОГО пользователя» с использованием \`LIMIT\`, что невозможно сделать простым \`LEFT JOIN\` без оконных функций.`,
      },
    ],
    taskDescription: `Напишите корректный аналитический SQL-запрос, рассчитывающий агрегированные показатели для каждого клиента из таблицы 'clients' без декартова размножения строк:
1. 'client_name': имя клиента ('c.name').
2. 'total_spent': общая сумма успешных покупок ('status = "completed"'). Если у клиента нет успешных заказов, должно выводиться 0.00.
3. 'total_cashback': общая сумма баллов кешбэка. Если кешбэка нет, выводить 0.
4. 'last_order_date': дата самого последнего успешного заказа (или NULL, если заказов не было).
Отсортируйте результат по 'total_spent' по убыванию, а при равенстве — по 'client_name' по возрастанию.`,
    seedCode: `CREATE TABLE clients (
    client_id INT PRIMARY KEY,
    name VARCHAR(50)
);

CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    client_id INT,
    amount NUMERIC(10,2),
    status VARCHAR(20),
    order_date DATE
);

CREATE TABLE cashbacks (
    cashback_id INT PRIMARY KEY,
    client_id INT,
    points INT
);

INSERT INTO clients VALUES
(1, 'Анна'),
(2, 'Борис'),
(3, 'Виктор'),
(4, 'Галина');

INSERT INTO orders VALUES
(101, 1, 5000.00, 'completed', '2026-10-10'),
(102, 1, 3000.00, 'completed', '2026-10-15'),
(103, 1, 1500.00, 'cancelled', '2026-10-20'),
(104, 2, 8000.00, 'completed', '2026-10-12'),
(105, 3, 2000.00, 'cancelled', '2026-10-14');

INSERT INTO cashbacks VALUES
(201, 1, 100),
(202, 1, 150),
(203, 2, 50),
(204, 4, 300);`,
    initialCode: `-- Напишите безопасный агрегатный запрос через CTE, избегая декартова взрыва
WITH agg_orders AS (
    -- агрегируйте только completed заказы
),
agg_cashback AS (
    -- агрегируйте баллы кешбэка
)
SELECT 
    -- client_name, total_spent, total_cashback, last_order_date
FROM clients c
-- LEFT JOIN ...
ORDER BY total_spent DESC, client_name ASC;`,
    solutionCode: `WITH agg_orders AS (
    SELECT 
        client_id,
        ROUND(SUM(amount), 2) AS total_spent,
        MAX(order_date) AS last_order_date
    FROM orders
    WHERE status = 'completed'
    GROUP BY client_id
),
agg_cashback AS (
    SELECT 
        client_id,
        SUM(points) AS total_cashback
    FROM cashbacks
    GROUP BY client_id
)
SELECT 
    c.name AS client_name,
    COALESCE(o.total_spent, 0.00) AS total_spent,
    COALESCE(cb.total_cashback, 0) AS total_cashback,
    o.last_order_date
FROM clients c
LEFT JOIN agg_orders o ON c.client_id = o.client_id
LEFT JOIN agg_cashback cb ON c.client_id = cb.client_id
ORDER BY total_spent DESC, client_name ASC;`,
    testConfig: {
      checkOrder: true,
      floatPrecision: 2,
      expectedRowCount: 4,
      expectedColumns: ['client_name', 'total_spent', 'total_cashback', 'last_order_date'],
    },
    brokenProdTask: {
      title: 'Инцидент #108: Финансовый отчет задвоил суммы выручки и баллов',
      incidentDescription: 'Младший дата-инженер соединил таблицу клиентов напрямую с заказами и кешбэком через два LEFT JOIN в одном запросе с GROUP BY c.name. Из-за декартова произведения у клиентов с несколькими заказами суммы выручки задвоились.',
      buggyCode: `SELECT 
    c.name AS client_name,
    COALESCE(SUM(o.amount), 0.00) AS total_spent,
    COALESCE(SUM(cb.points), 0) AS total_cashback,
    MAX(o.order_date) AS last_order_date
FROM clients c
LEFT JOIN orders o ON c.client_id = o.client_id AND o.status = 'completed'
LEFT JOIN cashbacks cb ON c.client_id = cb.client_id
GROUP BY c.name
ORDER BY total_spent DESC, client_name ASC;`,
      fixHint: 'Вынесите агрегацию orders и cashbacks в раздельные предварительные CTE до соединения с clients.',
      solutionCode: `WITH agg_orders AS (
    SELECT 
        client_id,
        ROUND(SUM(amount), 2) AS total_spent,
        MAX(order_date) AS last_order_date
    FROM orders
    WHERE status = 'completed'
    GROUP BY client_id
),
agg_cashback AS (
    SELECT 
        client_id,
        SUM(points) AS total_cashback
    FROM cashbacks
    GROUP BY client_id
)
SELECT 
    c.name AS client_name,
    COALESCE(o.total_spent, 0.00) AS total_spent,
    COALESCE(cb.total_cashback, 0) AS total_cashback,
    o.last_order_date
FROM clients c
LEFT JOIN agg_orders o ON c.client_id = o.client_id
LEFT JOIN agg_cashback cb ON c.client_id = cb.client_id
ORDER BY total_spent DESC, client_name ASC;`,
      testConfig: {
        checkOrder: true,
        floatPrecision: 2,
      },
    },
    hints: [
      'Создайте первый CTE для таблицы orders: сгруппируйте по client_id, отфильтровав status = "completed".',
      'Создайте второй CTE для таблицы cashbacks: сгруппируйте по client_id с расчетом SUM(points).',
      'Соедините таблицу clients с обоими CTE через LEFT JOIN, используя COALESCE для замены NULL на 0.',
    ],
  },
  {
    id: 'sql-4',
    moduleSlug: 'sql',
    order: 4,
    title: 'Рекурсивные CTE: Обход графов, иерархий сотрудников и защита от вечных циклов',
    estimatedMinutes: 40,
    glossaryTerms: [
      { term: 'Anchor Member', definition: 'Якорь рекурсии — базовая нерекурсивная часть CTE, формирующая начальное множество строк (корень дерева или начальное состояние).' },
      { term: 'Recursive Member', definition: 'Рекурсивная часть CTE, соединяющаяся с результатами предшествующей итерации (рабочей таблицей).' },
      { term: 'Working Table', definition: 'Внутренняя промежуточная таблица движка СУБД, в которой хранятся строки, сгенерированные ровно на предыдущем шаге рекурсии.' },
      { term: 'Cycle Detection', definition: 'Механизм защиты от зацикливаний при обходе ориентированных графов с циклическими зависимостями.' },
      { term: 'Breadth-First Search (BFS)', definition: 'Поиск в ширину — последовательный обход дерева уровень за уровнем (сначала все непосредственные подчиненные, затем подчиненные следующего уровня).' },
    ],
    schemaPreview: [
      {
        tableName: 'org_hierarchy',
        description: 'Иерархическая структура подчиненности компании',
        columns: [
          { name: 'employee_id', type: 'INT', keyType: 'PK' },
          { name: 'name', type: 'VARCHAR(50)' },
          { name: 'role', type: 'VARCHAR(50)' },
          { name: 'manager_id', type: 'INT', keyType: 'FK' },
        ],
        sampleRows: [
          { employee_id: 1, name: 'Алексей', role: 'CEO', manager_id: null },
          { employee_id: 2, name: 'Мария', role: 'Head of Data', manager_id: 1 },
          { employee_id: 3, name: 'Сергей', role: 'Head of Backend', manager_id: 1 },
          { employee_id: 4, name: 'Дмитрий', role: 'Senior Data Engineer', manager_id: 2 },
          { employee_id: 5, name: 'Елена', role: 'Junior Data Engineer', manager_id: 4 },
        ],
      },
    ],
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Физика рекурсии в SQL: как движок выполняет WITH RECURSIVE

Рекурсивные обобщенные табличные выражения (\`WITH RECURSIVE\`) — это стандартный инструмент реляционных СУБД для обработки графов, деревьев зависимостей (DAG), иерархий подчиненности и генерации последовательностей.

Синтаксис рекурсивного выражения строго делится на две части через \`UNION ALL\`:
\`\`\`sql
WITH RECURSIVE subordinates AS (
    -- 1. ЯКОРЬ (Anchor Member): начальное состояние (уровень 1)
    SELECT employee_id, name, role, 1 AS level, name AS chain
    FROM org_hierarchy
    WHERE manager_id IS NULL

    UNION ALL

    -- 2. РЕКУРСИВНЫЙ ШАГ (Recursive Member): соединение с предыдущим шагом
    SELECT e.employee_id, e.name, e.role, s.level + 1, s.chain || ' -> ' || e.name
    FROM org_hierarchy e
    JOIN subordinates s ON e.manager_id = s.employee_id
)
SELECT * FROM subordinates;
\`\`\`

#### Внутренний алгоритм реляционного движка (Execution Engine)
Когда планировщик видит \`WITH RECURSIVE\`, он инициализирует две внутренние структуры в оперативной памяти:
1. **\`Intermediate Table\` (Результирующий накопитель):** Сюда последовательно дописываются все найденные строки.
2. **\`Working Table\` (Рабочая очередь текущего шага):** Содержит строки, полученные на шаге $k$, которые будут использоваться для поиска строк на шаге $k + 1$.

**Пошаговый цикл работы:**
* **Шаг 0 (Инициализация):** Движок выполняет **Anchor Member**. Полученные строки записываются в \`Intermediate Table\` и в \`Working Table\`.
* **Шаг $k$ (Рекурсивная итерация):** Движок выполняет **Recursive Member**, где псевдоним \`subordinates\` подменяется на \`Working Table\`. Найденные дочерние строки помещаются в новую рабочую очередь.
* **Шаг проверки:** Если новая рабочая очередь пуста — рекурсия немедленно завершается. Если в ней есть строки — они добавляются в \`Intermediate Table\`, старая \`Working Table\` очищается, и цикл повторяется.

#### Проблема бесконечной рекурсии и циклических ссылок
Если в иерархических данных появляется циклическая ссылка (например, сотрудник А указан менеджером сотрудника Б, а сотрудник Б указан менеджером сотрудника А, либо $id = 42$ ссылается сам на себя), запрос превратится в **вечный цикл**!

Рабочая таблица \`Working Table\` никогда не опустеет. Она будет непрерывно выделять оперативную память \`work_mem\`, затем сбрасывать временные файлы на диск, пока не переполнит диск хоста или не будет принудительно убита ядром ОС по Out of Memory (OOM Killer).

**Защита от зацикливания:**
1. Ограничение максимальной глубины обхода: \`WHERE s.level < 50\`.
2. Контроль посещенных узлов через проверку вхождения идентификатора в массив или строковый путь: \`WHERE s.chain NOT LIKE '%' || e.name || '%'\`.`,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Дерево папок на компьютере или матрёшка',
        content: `Представьте, что вы пишете скрипт обхода всех папок на диске. 
Anchor (Якорь) — это чтение файлов в корневой папке \`/\`.
Recursive Step — это открытие каждой найденной подпапки и чтение ее содержимого.
Пока внутри открытой папки находятся новые вложенные папки, процесс продолжается вглубь до самого дна.`,
      },
      {
        type: 'data-flow',
        data: {
          title: 'Граф разворачивания организационной структуры через рекурсивный CTE',
          nodes: [
            { id: 'ceo', label: 'Алексей (CEO)', sublabel: 'Level 1 [Anchor]', type: 'source', status: 'success' },
            { id: 'head_data', label: 'Мария (Head of Data)', sublabel: 'Level 2', type: 'transform', status: 'idle' },
            { id: 'head_backend', label: 'Сергей (Head of Backend)', sublabel: 'Level 2', type: 'transform', status: 'idle' },
            { id: 'senior_de', label: 'Дмитрий (Senior DE)', sublabel: 'Level 3', type: 'transform', status: 'idle' },
            { id: 'junior_de', label: 'Елена (Junior DE)', sublabel: 'Level 4 [Leaf]', type: 'consumer', status: 'idle' },
          ],
          edges: [
            { from: 'ceo', to: 'head_data', label: 'manager_id = 1', animated: true },
            { from: 'ceo', to: 'head_backend', label: 'manager_id = 1', animated: true },
            { from: 'head_data', to: 'senior_de', label: 'manager_id = 2', animated: true },
            { from: 'senior_de', to: 'junior_de', label: 'manager_id = 4', animated: true },
          ],
        },
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: OOM-падение прод-кластера из-за циклической категории (id=42 -> parent=42)',
        content: `При миграции каталога товаров интернет-магазина контент-менеджер случайно отредактировал категорию «Электроника», указав ее родительской категорией саму себя. 
Ночной расчет витрины товарного дерева запустил рекурсивный CTE без ограничения глубины. Запрос крутился 25 минут, сожрал 64 ГБ оперативной памяти и заполнил 200 ГБ временных файлов на SSD, после чего Linux OOM Killer аварийно завершил основной процесс PostgreSQL.

**Правило:** В любом рекурсивном CTE на продакшене ОБЯЗАНО присутствовать ограничение глубины: \`WHERE s.level < 100\`!`,
      },
      {
        type: 'callout',
        variant: 'interview',
        title: '🎯 Спросят на собесе: В чем разница между UNION и UNION ALL в рекурсивном CTE и почему UNION в рекурсии опасен?',
        content: `**Ответ:** 
- При \`UNION ALL\` строки каждого шага без задержки дописываются в рабочий буфер. Это быстрая потоковая операция со сложностью $O(1)$ на строку.
- При \`UNION\` движок обязан на КАЖДОЙ итерации выполнять дедупликацию: собирать хэш-таблицу или сортировать всю накопленную таблицу в памяти, чтобы удалить повторяющиеся строки. 
В 99% задач обхода деревьев дубликатов на соседних шагах нет по природе иерархии, поэтому использование \`UNION\` вместо \`UNION ALL\` в рекурсивном CTE замедляет запрос в 10–50 раз и многократно увеличивает расход CPU и RAM.`,
      },
    ],
    taskDescription: `Используя конструкцию 'WITH RECURSIVE', постройте полную иерархическую структуру компании от генерального директора до рядовых сотрудников:
1. 'employee_id': идентификатор сотрудника.
2. 'name': имя сотрудника.
3. 'role': должность сотрудника.
4. 'level': уровень вложенности в иерархии (1 для CEO, 2 для прямых подчиненных CEO, 3 для подчиненных второго уровня и т.д.).
5. 'chain': строковый путь подчиненности от CEO до текущего сотрудника через разделитель ' -> ' (например: 'Алексей' для CEO, 'Алексей -> Мария' для Head of Data, 'Алексей -> Мария -> Дмитрий' для Senior DE).
Отсортируйте результат по 'level' по возрастанию, а при равенстве — по 'employee_id' по возрастанию.`,
    seedCode: `CREATE TABLE org_hierarchy (
    employee_id INT PRIMARY KEY,
    name VARCHAR(50),
    role VARCHAR(50),
    manager_id INT
);

INSERT INTO org_hierarchy VALUES
(1, 'Алексей', 'CEO', NULL),
(2, 'Мария', 'Head of Data', 1),
(3, 'Сергей', 'Head of Backend', 1),
(4, 'Дмитрий', 'Senior Data Engineer', 2),
(5, 'Елена', 'Junior Data Engineer', 4);`,
    initialCode: `-- Напишите рекурсивный CTE для обхода дерева иерархии
WITH RECURSIVE subordinates AS (
    -- 1. Якорь (CEO): найдите сотрудника с manager_id IS NULL
    SELECT 
        employee_id,
        name,
        role,
        1 AS level,
        name AS chain
    FROM org_hierarchy
    WHERE manager_id IS NULL

    UNION ALL

    -- 2. Рекурсивный шаг: соедините таблицу org_hierarchy с subordinates
    SELECT 
        e.employee_id,
        e.name,
        e.role,
        -- вычисление level,
        -- конкатенация chain через || ' -> ' ||
    FROM org_hierarchy e
    JOIN subordinates s ON e.manager_id = s.employee_id
)
SELECT employee_id, name, role, level, chain
FROM subordinates
ORDER BY level ASC, employee_id ASC;`,
    solutionCode: `WITH RECURSIVE subordinates AS (
    SELECT 
        employee_id,
        name,
        role,
        1 AS level,
        name AS chain
    FROM org_hierarchy
    WHERE manager_id IS NULL

    UNION ALL

    SELECT 
        e.employee_id,
        e.name,
        e.role,
        s.level + 1 AS level,
        s.chain || ' -> ' || e.name AS chain
    FROM org_hierarchy e
    JOIN subordinates s ON e.manager_id = s.employee_id
)
SELECT employee_id, name, role, level, chain
FROM subordinates
ORDER BY level ASC, employee_id ASC;`,
    testConfig: {
      checkOrder: true,
      floatPrecision: 2,
      expectedRowCount: 5,
      expectedColumns: ['employee_id', 'name', 'role', 'level', 'chain'],
    },
    brokenProdTask: {
      title: 'Инцидент #109: Зависание сервера аналитики из-за бесконечной рекурсии',
      incidentDescription: 'Дата-инженер забыл условие соединения e.manager_id = s.employee_id, из-за чего рекурсивный шаг стал порождать декартово произведение самого себя на каждой итерации, подвесив ETL-воркер.',
      buggyCode: `WITH RECURSIVE subordinates AS (
    SELECT 
        employee_id,
        name,
        role,
        1 AS level,
        name AS chain
    FROM org_hierarchy
    WHERE manager_id IS NULL

    UNION ALL

    SELECT 
        e.employee_id,
        e.name,
        e.role,
        s.level + 1 AS level,
        s.chain || ' -> ' || e.name AS chain
    FROM org_hierarchy e
    JOIN subordinates s ON e.employee_id = s.employee_id -- ❌ Ошибка: сотрудник соединяется сам с собой!
)
SELECT employee_id, name, role, level, chain
FROM subordinates
WHERE level <= 5
ORDER BY level ASC, employee_id ASC;`,
      fixHint: 'Исправьте условие соединения в рекурсивной части: e.manager_id = s.employee_id.',
      solutionCode: `WITH RECURSIVE subordinates AS (
    SELECT 
        employee_id,
        name,
        role,
        1 AS level,
        name AS chain
    FROM org_hierarchy
    WHERE manager_id IS NULL

    UNION ALL

    SELECT 
        e.employee_id,
        e.name,
        e.role,
        s.level + 1 AS level,
        s.chain || ' -> ' || e.name AS chain
    FROM org_hierarchy e
    JOIN subordinates s ON e.manager_id = s.employee_id
)
SELECT employee_id, name, role, level, chain
FROM subordinates
ORDER BY level ASC, employee_id ASC;`,
      testConfig: {
        checkOrder: true,
        floatPrecision: 2,
      },
    },
    hints: [
      'В якорной части выберите сотрудника с manager_id IS NULL, задав level = 1 и chain = name.',
      'В рекурсивной части соединяйте таблицу org_hierarchy e с subordinates s по условию e.manager_id = s.employee_id.',
      'Увеличивайте уровень на 1 (s.level + 1) и формируйте путь через оператор конкатенации строк: s.chain || " -> " || e.name.',
    ],
  },
  {
    id: 'sql-5',
    moduleSlug: 'sql',
    order: 5,
    title: 'Алгоритмический паттерн Gaps & Islands: Поиск непрерывных интервалов активности',
    estimatedMinutes: 40,
    glossaryTerms: [
      { term: 'Islands (Острова)', definition: 'Непрерывные интервалы записей во временных рядах, где условие активности выполняется без единого разрыва.' },
      { term: 'Gaps (Разрывы)', definition: 'Промежутки или пропущенные интервалы тишины между островами активности.' },
      { term: 'Difference of Sequences', definition: 'Математический метод поиска островов: вычитание плотного ранга ROW_NUMBER() из монотонно растущей даты, дающее константный ключ группы.' },
      { term: 'Cumulative Flag Sum', definition: 'Альтернативный алгоритм решения Gaps & Islands через LAG(), флаг разрыва (0 или 1) и накопительную сумму SUM() OVER (ROWS UNBOUNDED PRECEDING).' },
      { term: 'Step Function', definition: 'Ступенчатая функция — агрегатное состояние, сохраняющее свое значение неизменным на протяжении всего острова данных.' },
    ],
    schemaPreview: [
      {
        tableName: 'user_activity_log',
        description: 'Сырой лог ежедневной активности пользователей платформы',
        columns: [
          { name: 'log_id', type: 'INT', keyType: 'PK' },
          { name: 'user_id', type: 'INT', keyType: 'FK' },
          { name: 'activity_date', type: 'DATE' },
          { name: 'actions_count', type: 'INT' },
        ],
        sampleRows: [
          { log_id: 1, user_id: 101, activity_date: '2026-10-01', actions_count: 5 },
          { log_id: 2, user_id: 101, activity_date: '2026-10-02', actions_count: 8 },
          { log_id: 3, user_id: 101, activity_date: '2026-10-03', actions_count: 12 },
          { log_id: 4, user_id: 101, activity_date: '2026-10-06', actions_count: 4 },
          { log_id: 5, user_id: 101, activity_date: '2026-10-07', actions_count: 7 },
        ],
      },
    ],
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Классический алгоритм Data Engineering: Gaps & Islands

Задача **Gaps & Islands (Разрывы и Острова)** — это золотой стандарт собеседований на грейды Middle и Senior Data Engineer. 

Она возникает в реальном проде ежедневно:
* Расчет пользовательских **стриков** (дней непрерывного захода в приложение подряд).
* Анализ работы IoT-датчиков (периоды, когда станок непрерывно работал без сбоев).
* Выявление периодов неизменности цены товара для витрин историчности (SCD Type 2).
* Поиск пропущенных номеров банковских платежек или счетов-фактур.

#### Математическая физика алгоритма «Разность последовательностей»
Большинство джуниоров пытаются решить задачу через вложенные циклы или самосоединения, что приводит к чудовищной асимптотике $O(N^2)$ и падению БД.

Опытный дата-инженер использует фундаментальное математическое свойство **двух параллельно растущих шкал**:
1. Первая шкала — это физическая дата события $D_i$.
2. Вторая шкала — это идеальный порядковый номер строки $R_i = \\text{ROW\\_NUMBER}()$ без пропусков (1, 2, 3, 4...).

Рассмотрим, что происходит с математической разностью $D_i - R_i \\cdot (1\\text{ день})$:

| activity_date ($D_i$) | ROW_NUMBER ($R_i$) | Разность: $D_i - R_i$ дней | Статус острова |
| :--- | :--- | :--- | :--- |
| **2026-10-01** | 1 | 2026-10-01 − 1 дн = **2026-09-30** | Остров #1 |
| **2026-10-02** | 2 | 2026-10-02 − 2 дн = **2026-09-30** | Остров #1 |
| **2026-10-03** | 3 | 2026-10-03 − 3 дн = **2026-09-30** | Остров #1 |
| *2026-10-04 (пропуск)* | — | — | *Разрыв (GAP)* |
| *2026-10-05 (пропуск)* | — | — | *Разрыв (GAP)* |
| **2026-10-06** | 4 | 2026-10-06 − 4 дн = **2026-10-02** | Остров #2 |
| **2026-10-07** | 5 | 2026-10-07 − 5 дн = **2026-10-02** | Остров #2 |

**Гениальный вывод:** Пока даты идут подряд день за днем, скорость роста даты и скорость роста номера строки равны 1. Их разность **абсолютно константна**!
Как только возникает разрыв (Gap) на 2 дня, дата скачет вперед на 3 дня, а $R_i$ — всего на 1. Разность мгновенно перескакивает на новое константное значение (\`2026-10-02\`)!

Следовательно, сгруппировав записи по вычисленной дате-константе:
\`\`\`sql
GROUP BY date(activity_date, '-' || ROW_NUMBER() OVER (ORDER BY activity_date) || ' days')
\`\`\`
мы моментально получаем идеальные границы каждого острова через \`MIN(activity_date)\`, \`MAX(activity_date)\` и \`COUNT(*)\` со сложностью всего **$O(N \\log N)$** (время сортировки индекса)!`,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Одометр автомобиля и календарь',
        content: `Представьте, что вы каждый день проезжаете ровно 100 км:
День 1: 100 км (разность 0)
День 2: 200 км (разность 0)
День 3: 300 км (разность 0)
Если в 4-й и 5-й день машина стояла в гараже, а на 6-й день вы проехали 100 км (спидометр показал 400 км), то разность между ожидаемым пробегом (600 км) и реальным (400 км) скачкообразно изменится на 200 км. Этот скачок разности и фиксирует границу нового периода.`,
      },
      {
        type: 'before-after-table',
        data: {
          title: 'Трансформация сырых логов активности в непрерывные острова',
          beforeDescription: 'Сырые логи: даты активности со случайными разрывами (Gaps)',
          beforeColumns: ['log_id', 'activity_date', 'actions_count'],
          beforeRows: [
            [1, '2026-10-01', 5],
            [2, '2026-10-02', 8],
            [3, '2026-10-03', 12],
            [4, '2026-10-06', 4],
            [5, '2026-10-07', 7],
            [6, '2026-10-09', 15],
          ],
          afterDescription: 'Результат работы алгоритма: сгруппированные острова со стриками >= 2 дней',
          afterColumns: ['start_date', 'end_date', 'days_streak', 'total_actions'],
          afterRows: [
            ['2026-10-01', '2026-10-03', 3, 25],
            ['2026-10-06', '2026-10-07', 2, 11],
          ],
          highlightDiffIndices: [
            { row: 0, col: 2 },
            { row: 1, col: 2 },
          ],
        },
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Срыв выплат бонусов за 7-дневный стрик из-за перехода на летнее время',
        content: `Финтех-сервис начислял кешбэк пользователям за 7-дневный непрерывный стрик оплат. 
Разработчик вычислял разрыв дат через \`timestamp - LAG(timestamp) = INTERVAL '24 hours'\`. 
В ночь перевода часов на летнее время интервал между платежами в 08:00 утра составил 23 часа, а осенью — 25 часов. Проверка равенства 24 часам дала \`FALSE\`, непрерывные стрики миллионов пользователей обнулились, а поддержка получила шквал жалоб.

**Правило:** При расчете календарных стриков всегда усекайте время до чистой даты (\`DATE(timestamp)\`) в локальном часовом поясе пользователя ДО оконных вычислений!`,
      },
      {
        type: 'callout',
        variant: 'interview',
        title: '🎯 Спросят на собесе: Докажите математически, почему разность даты и номера строки дает стабильный ключ группы?',
        content: `**Ответ:** 
Пусть дата задана целым числом дней от начала эпохи: $D_i$. 
Если внутри подпоследовательности каждое следующее событие наступает строго через 1 день, то $D_{i+1} = D_i + 1$. 
По определению оконной функции ранжирования $R_{i+1} = R_i + 1$. 
Вычтем второе равенство из первого:
$D_{i+1} - R_{i+1} = (D_i + 1) - (R_i + 1) = D_i - R_i = \\text{const}$. 
Следовательно, для любого непрерывного диапазона разность инвариантна относительно шага и образует уникальный детерминированный идентификатор группы (острова).`,
      },
    ],
    taskDescription: `Для таблицы 'user_activity_log' напишите SQL-запрос, который находит все непрерывные интервалы активности (острова) для пользователя 'user_id = 101':
1. 'start_date': дата начала непрерывной серии.
2. 'end_date': дата окончания непрерывной серии.
3. 'days_streak': количество дней подряд в данной серии ('COUNT(*)').
4. 'total_actions': суммарное количество действий пользователя за этот период ('SUM(actions_count)').
В результирующую выборку должны попасть ТОЛЬКО серии длительностью не менее 2 дней подряд ('days_streak >= 2').
Отсортируйте результат по 'start_date' по возрастанию.`,
    seedCode: `CREATE TABLE user_activity_log (
    log_id INT PRIMARY KEY,
    user_id INT,
    activity_date DATE,
    actions_count INT
);

INSERT INTO user_activity_log VALUES
(1, 101, '2026-10-01', 5),
(2, 101, '2026-10-02', 8),
(3, 101, '2026-10-03', 12),
(4, 101, '2026-10-06', 4),
(5, 101, '2026-10-07', 7),
(6, 101, '2026-10-09', 15),
(7, 102, '2026-10-01', 20);`,
    initialCode: `-- Реализуйте алгоритм Gaps & Islands через разность дат и ROW_NUMBER()
WITH numbered_days AS (
    SELECT 
        activity_date,
        actions_count,
        -- вычисление ключа группы: date(activity_date, '-' || ROW_NUMBER() OVER (...) || ' days')
    FROM user_activity_log
    WHERE user_id = 101
)
SELECT 
    -- start_date, end_date, days_streak, total_actions
FROM numbered_days
-- GROUP BY, HAVING, ORDER BY`,
    solutionCode: `WITH numbered_days AS (
    SELECT 
        activity_date,
        actions_count,
        date(activity_date, '-' || ROW_NUMBER() OVER (ORDER BY activity_date) || ' days') AS grp_key
    FROM user_activity_log
    WHERE user_id = 101
)
SELECT 
    MIN(activity_date) AS start_date,
    MAX(activity_date) AS end_date,
    COUNT(*) AS days_streak,
    SUM(actions_count) AS total_actions
FROM numbered_days
GROUP BY grp_key
HAVING COUNT(*) >= 2
ORDER BY start_date ASC;`,
    testConfig: {
      checkOrder: true,
      floatPrecision: 2,
      expectedRowCount: 2,
      expectedColumns: ['start_date', 'end_date', 'days_streak', 'total_actions'],
    },
    brokenProdTask: {
      title: 'Инцидент #110: Сбой в расчете игровых наград из-за потери первого дня серии',
      incidentDescription: 'Дата-инженер попытался вычислить стрики через функцию LAG(activity_date), но не обработал значение NULL на первой строке серии, из-за чего первый день каждого периода выпал из подсчета, и длина стриков занизилась на 1.',
      buggyCode: `WITH lagged AS (
    SELECT 
        activity_date,
        actions_count,
        CASE WHEN julianday(activity_date) - julianday(LAG(activity_date) OVER (ORDER BY activity_date)) = 1 THEN 0 ELSE 1 END as is_new_streak
    FROM user_activity_log
    WHERE user_id = 101
)
-- ❌ Ошибка в расчете: LAG() дает NULL на первой строке
SELECT 
    MIN(activity_date) as start_date,
    MAX(activity_date) as end_date,
    COUNT(*) as days_streak,
    SUM(actions_count) as total_actions
FROM lagged
WHERE is_new_streak = 0
GROUP BY is_new_streak;`,
      fixHint: 'Перепишите вычисление на надежный метод разности последовательностей: date(activity_date, "-" || ROW_NUMBER() OVER (ORDER BY activity_date) || " days").',
      solutionCode: `WITH numbered_days AS (
    SELECT 
        activity_date,
        actions_count,
        date(activity_date, '-' || ROW_NUMBER() OVER (ORDER BY activity_date) || ' days') AS grp_key
    FROM user_activity_log
    WHERE user_id = 101
)
SELECT 
    MIN(activity_date) AS start_date,
    MAX(activity_date) AS end_date,
    COUNT(*) AS days_streak,
    SUM(actions_count) AS total_actions
FROM numbered_days
GROUP BY grp_key
HAVING COUNT(*) >= 2
ORDER BY start_date ASC;`,
      testConfig: {
        checkOrder: true,
        floatPrecision: 2,
      },
    },
    hints: [
      'В CTE используйте функцию date(activity_date, "-" || ROW_NUMBER() OVER (ORDER BY activity_date) || " days") для генерации константного ключа группы.',
      'Во внешнем запросе сгруппируйте по вычисленному grp_key и используйте MIN(activity_date), MAX(activity_date), COUNT(*) и SUM(actions_count).',
      'Отфильтруйте серии короче 2 дней с помощью HAVING COUNT(*) >= 2.',
    ],
  },
  {
    id: 'sql-6',
    moduleSlug: 'sql',
    order: 6,
    title: 'Продвинутая дедупликация и операции над множествами: UNION ALL против UNION, QUALIFY и анти-джойны',
    estimatedMinutes: 35,
    glossaryTerms: [
      { term: 'Stream Append', definition: 'Потоковое слияние двух наборов данных в один непрерывный поток без промежуточных буферов памяти (UNION ALL).' },
      { term: 'Spill to Disk', definition: 'Аварийный сброс промежуточных данных во временные файлы на диск при исчерпании оперативной памяти work_mem.' },
      { term: 'Hash Anti-Join', definition: 'Физический алгоритм реляционного плана, отбрасывающий строки первого набора, для которых найден хотя бы один хэш-совпавший ключ во втором.' },
      { term: 'QUALIFY Clause', definition: 'Специальная секция фильтрации в Snowflake, ClickHouse, BigQuery и Databricks, позволяющая фильтровать результаты оконных функций без создания внешнего CTE.' },
      { term: 'Last-Win Deduplication', definition: 'Паттерн дедупликации, при котором среди нескольких версий одного бизнес-ключа сохраняется строго запись с самым поздним временем обновления.' },
    ],
    schemaPreview: [
      {
        tableName: 'primary_orders_stream',
        description: 'Основной поток заказов из процессинга платежей',
        columns: [
          { name: 'order_id', type: 'INT', keyType: 'PK' },
          { name: 'customer_id', type: 'INT', keyType: 'FK' },
          { name: 'status', type: 'VARCHAR(20)' },
          { name: 'amount', type: 'NUMERIC(10,2)' },
          { name: 'updated_at', type: 'TIMESTAMP' },
        ],
        sampleRows: [
          { order_id: 501, customer_id: 10, status: 'created', amount: 1200.00, updated_at: '2026-10-20 10:00:00' },
          { order_id: 502, customer_id: 20, status: 'paid', amount: 4500.00, updated_at: '2026-10-20 10:05:00' },
          { order_id: 503, customer_id: 99, status: 'created', amount: 9000.00, updated_at: '2026-10-20 10:10:00' },
        ],
      },
      {
        tableName: 'backup_orders_stream',
        description: 'Резервный поток заказов из мобильного шлюза',
        columns: [
          { name: 'order_id', type: 'INT', keyType: 'PK' },
          { name: 'customer_id', type: 'INT', keyType: 'FK' },
          { name: 'status', type: 'VARCHAR(20)' },
          { name: 'amount', type: 'NUMERIC(10,2)' },
          { name: 'updated_at', type: 'TIMESTAMP' },
        ],
        sampleRows: [
          { order_id: 501, customer_id: 10, status: 'paid', amount: 1200.00, updated_at: '2026-10-20 10:02:00' },
          { order_id: 504, customer_id: 30, status: 'delivered', amount: 3100.00, updated_at: '2026-10-20 10:15:00' },
          { order_id: 503, customer_id: 99, status: 'paid', amount: 9000.00, updated_at: '2026-10-20 10:12:00' },
        ],
      },
      {
        tableName: 'blacklisted_customers',
        description: 'Реестр заблокированных клиентов (мошенничество)',
        columns: [
          { name: 'customer_id', type: 'INT', keyType: 'PK' },
          { name: 'reason', type: 'VARCHAR(100)' },
        ],
        sampleRows: [
          { customer_id: 99, reason: 'Мошеннические операции с чарджбэками' },
        ],
      },
    ],
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Физика операций над множествами: почему UNION убивает производительность

В ETL-пайплайнах дата-инженерам постоянно требуется объединять данные из нескольких источников (например, сырые логи из двух очередей Kafka или исторический срез с инкрементальным днем).

Стандарт SQL предоставляет две операции объединения:
1. **\`UNION ALL\`:** Простое потоковое склеивание. Движок читает поток А, затем поток Б и сразу отдает результат вызывающему процессу. Сложность: $O(N + M)$ по времени и **$O(1)$ по оперативной памяти**!
2. **\`UNION\` (без ALL):** Выполняет склеивание И ОБЯЗАТЕЛЬНУЮ ДЕДУПЛИКАЦИЮ. Чтобы удалить дубликаты, движок обязан либо построить гигантскую хэш-таблицу в оперативной памяти (\`Hash Aggregate\`), либо выполнить внешнюю сортировку (\`Sort + Unique\`).

#### Катастрофа Spill to Disk при использовании UNION
Если объем объединяемых таблиц превышает параметр выделенной рабочей памяти (\`work_mem\` в PostgreSQL или \`max_bytes_before_external_sort\` в ClickHouse), СУБД не может выполнить дедупликацию в оперативной памяти.

Она вынуждена:
1. Разбить данные на куски (Runs) и записать их во временные файлы на диск.
2. Прочитать временные файлы с диска и выполнить многофазную сортировку слиянием (**External Merge Sort**).
3. Скорость выполнения запроса падает в **50–200 раз**, а диск сервера подвергается колоссальной нагрузке по I/O (Input/Output).

**Железное правило DE:** В 99% случаев объединения таблиц в пайплайнах данных используйте **\`UNION ALL\`**. Если дедупликация действительно необходима, управляйте ей явно через оконную функцию \`ROW_NUMBER()\` по бизнес-ключу!

#### Анатомия анти-джойнов: NOT EXISTS против LEFT JOIN IS NULL
Когда требуется отфильтровать нежелательные записи (например, исключить клиентов из черного списка), начинающие инженеры часто пишут:
\`\`\`sql
-- Вариант 1: Через LEFT JOIN
SELECT m.* 
FROM merged_stream m
LEFT JOIN blacklisted_customers b ON m.customer_id = b.customer_id
WHERE b.customer_id IS NULL;
\`\`\`

Хотя этот запрос дает верный результат, оптимизатор вынужден материализовать все колонки обеих таблиц.
Гораздо эффективнее использовать семантический анти-джойн:
\`\`\`sql
-- Вариант 2 (Идеальный): Через NOT EXISTS
SELECT m.*
FROM merged_stream m
WHERE NOT EXISTS (
    SELECT 1 FROM blacklisted_customers b 
    WHERE b.customer_id = m.customer_id
);
\`\`\`
Оптимизатор запросов мгновенно распознает конструкцию \`NOT EXISTS\` и строит **\`Hash Anti Join\`**: как только найдено первое совпадение в таблице мошенников, сканирование немедленно прерывается (Short-Circuit Evaluation), экономя такты процессора!`,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Сортировка посылок на почтовом складе',
        content: `Представьте, что к складу подъехали две фуры с коробками:
- **\`UNION ALL\`**: Рабочие просто разгружают коробки из первой фуры на конвейер, а затем из второй. Конвейер движется непрерывно с максимальной скоростью.
- **\`UNION\`**: Рабочие останавливают конвейер, выгружают все 100 000 коробок на пол склада, читают штрихкод на каждой коробке, сравнивают каждую коробку со всеми остальными, чтобы найти дубликаты, и только потом пускают их дальше.`,
      },
      {
        type: 'data-flow',
        data: {
          title: 'Высокопроизводительный конвейер объединения, фильтрации и дедупликации потоков',
          nodes: [
            { id: 'primary', label: 'Primary Stream', sublabel: 'Основной шлюз', type: 'source', status: 'success' },
            { id: 'backup', label: 'Backup Stream', sublabel: 'Резервный шлюз', type: 'source', status: 'success' },
            { id: 'union_all', label: 'Stream Append [UNION ALL]', sublabel: 'Zero Memory Overhead', type: 'transform', status: 'running' },
            { id: 'anti_join', label: 'Hash Anti-Join', sublabel: 'Исключение мошенников', type: 'transform', status: 'idle' },
            { id: 'dedup', label: 'Row_Number Window', sublabel: 'Last-Win Deduplication', type: 'storage', status: 'idle' },
          ],
          edges: [
            { from: 'primary', to: 'union_all', animated: true },
            { from: 'backup', to: 'union_all', animated: true },
            { from: 'union_all', to: 'anti_join', label: 'Merged Flow', animated: true },
            { from: 'anti_join', to: 'dedup', label: 'Cleaned Flow', animated: true },
          ],
        },
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Зависание ночного ETL на 5 часов из-за случайного UNION на 50 млн строк',
        content: `При переписывании ночного витринного пайплайна разработчик объединил исторический снепшот (45 млн строк) и суточный инкремент (5 млн строк) с помощью \`UNION\` вместо \`UNION ALL\`. 
Запрос, который раньше выполнялся за 40 секунд, ушел во внешнюю сортировку на диске, забил временными файлами 180 ГБ дискового пространства и выполнялся 5 часов 20 минут, задержав публикацию утренних финансовых дашбордов для руководства.

**Решение:** Если после объединения в коде все равно вызывается дедупликация через \`ROW_NUMBER()\`, использование \`UNION\` без \`ALL\` является грубой архитектурной ошибкой!`,
      },
      {
        type: 'callout',
        variant: 'interview',
        title: '🎯 Спросят на собесе: Почему использование UNION без ALL в ELT-пайплайнах считается код-ревьюерами плохим тоном?',
        content: `**Ответ:** 
1. **Непредсказуемость ресурсов:** \`UNION\` скрывает за собой неявную операцию сортировки всего набора данных или построения огромной хэш-таблицы, что при росте объема данных неизбежно приводит к \`Spill to Disk\` и падению ETL по таймауту.
2. **Потеря контроля:** \`UNION\` дедуплицирует строки целиком (по всем колонкам). В реальных хранилищах данных дедупликация почти всегда должна производиться по определенному бизнес-ключу с сохранением самой свежей версии (\`Last-Win\`), что достигается строго через \`ROW_NUMBER() OVER (PARTITION BY key ORDER BY ts DESC)\`.`,
      },
    ],
    taskDescription: `Соберите чистую витрину актуальных заказов из двух параллельных источников данных:
1. Объедините потоки 'primary_orders_stream' и 'backup_orders_stream' с помощью высокопроизводительного 'UNION ALL'.
2. Исключите из рассмотрения заказы клиентов, находящихся в черном списке 'blacklisted_customers', используя безопасный анти-джойн через 'WHERE NOT EXISTS (...)'.
3. Произведите дедупликацию: для каждого 'order_id' оставьте ровно одну версию с самым свежим временем обновления ('updated_at'), используя оконную функцию 'ROW_NUMBER()'.
4. Выведите финальные колонки: 'order_id', 'customer_id', 'status', 'amount', 'updated_at'.
5. Отсортируйте результат по 'order_id' по возрастанию.`,
    seedCode: `CREATE TABLE primary_orders_stream (
    order_id INT,
    customer_id INT,
    status VARCHAR(20),
    amount NUMERIC(10,2),
    updated_at TIMESTAMP
);

CREATE TABLE backup_orders_stream (
    order_id INT,
    customer_id INT,
    status VARCHAR(20),
    amount NUMERIC(10,2),
    updated_at TIMESTAMP
);

CREATE TABLE blacklisted_customers (
    customer_id INT PRIMARY KEY,
    reason VARCHAR(100)
);

INSERT INTO blacklisted_customers VALUES
(99, 'Мошеннические операции с чарджбэками');

INSERT INTO primary_orders_stream VALUES
(501, 10, 'created', 1200.00, '2026-10-20 10:00:00'),
(502, 20, 'paid', 4500.00, '2026-10-20 10:05:00'),
(503, 99, 'created', 9000.00, '2026-10-20 10:10:00');

INSERT INTO backup_orders_stream VALUES
(501, 10, 'paid', 1200.00, '2026-10-20 10:02:00'),
(504, 30, 'delivered', 3100.00, '2026-10-20 10:15:00'),
(503, 99, 'paid', 9000.00, '2026-10-20 10:12:00');`,
    initialCode: `-- Объедините потоки через UNION ALL, отфильтруйте мошенников и дедуплицируйте через ROW_NUMBER()
WITH merged_stream AS (
    -- UNION ALL потоков primary и backup
),
filtered_and_ranked AS (
    -- NOT EXISTS с blacklisted_customers и ROW_NUMBER() OVER (...)
)
SELECT 
    order_id, customer_id, status, amount, updated_at
FROM filtered_and_ranked
WHERE rn = 1
ORDER BY order_id ASC;`,
    solutionCode: `WITH merged_stream AS (
    SELECT order_id, customer_id, status, amount, updated_at
    FROM primary_orders_stream
    UNION ALL
    SELECT order_id, customer_id, status, amount, updated_at
    FROM backup_orders_stream
),
filtered_and_ranked AS (
    SELECT 
        m.order_id,
        m.customer_id,
        m.status,
        m.amount,
        m.updated_at,
        ROW_NUMBER() OVER (
            PARTITION BY m.order_id 
            ORDER BY m.updated_at DESC
        ) AS rn
    FROM merged_stream m
    WHERE NOT EXISTS (
        SELECT 1 
        FROM blacklisted_customers b 
        WHERE b.customer_id = m.customer_id
    )
)
SELECT order_id, customer_id, status, amount, updated_at
FROM filtered_and_ranked
WHERE rn = 1
ORDER BY order_id ASC;`,
    testConfig: {
      checkOrder: true,
      floatPrecision: 2,
      expectedRowCount: 3,
      expectedColumns: ['order_id', 'customer_id', 'status', 'amount', 'updated_at'],
    },
    brokenProdTask: {
      title: 'Инцидент #111: Зависание ночной витрины из-за тяжелого UNION вместо UNION ALL',
      incidentDescription: 'Дата-инженер соединил стрики через тяжелый оператор UNION, а затем применил ROW_NUMBER(), что вызвало бессмысленную двойную дедупликацию и сброс миллионов строк на диск.',
      buggyCode: `WITH merged_stream AS (
    -- ❌ Грубая ошибка: тяжелый UNION вместо легкого UNION ALL
    SELECT order_id, customer_id, status, amount, updated_at
    FROM primary_orders_stream
    UNION
    SELECT order_id, customer_id, status, amount, updated_at
    FROM backup_orders_stream
),
filtered_and_ranked AS (
    SELECT 
        m.order_id,
        m.customer_id,
        m.status,
        m.amount,
        m.updated_at,
        ROW_NUMBER() OVER (
            PARTITION BY m.order_id 
            ORDER BY m.updated_at DESC
        ) AS rn
    FROM merged_stream m
    WHERE NOT EXISTS (
        SELECT 1 
        FROM blacklisted_customers b 
        WHERE b.customer_id = m.customer_id
    )
)
SELECT order_id, customer_id, status, amount, updated_at
FROM filtered_and_ranked
WHERE rn = 1
ORDER BY order_id ASC;`,
      fixHint: 'Замените ресурсоемкий оператор UNION на быстрый потоковый UNION ALL.',
      solutionCode: `WITH merged_stream AS (
    SELECT order_id, customer_id, status, amount, updated_at
    FROM primary_orders_stream
    UNION ALL
    SELECT order_id, customer_id, status, amount, updated_at
    FROM backup_orders_stream
),
filtered_and_ranked AS (
    SELECT 
        m.order_id,
        m.customer_id,
        m.status,
        m.amount,
        m.updated_at,
        ROW_NUMBER() OVER (
            PARTITION BY m.order_id 
            ORDER BY m.updated_at DESC
        ) AS rn
    FROM merged_stream m
    WHERE NOT EXISTS (
        SELECT 1 
        FROM blacklisted_customers b 
        WHERE b.customer_id = m.customer_id
    )
)
SELECT order_id, customer_id, status, amount, updated_at
FROM filtered_and_ranked
WHERE rn = 1
ORDER BY order_id ASC;`,
      testConfig: {
        checkOrder: true,
        floatPrecision: 2,
      },
    },
    hints: [
      'В первом CTE объедините primary_orders_stream и backup_orders_stream через UNION ALL.',
      'Во втором CTE добавьте условие WHERE NOT EXISTS (SELECT 1 FROM blacklisted_customers b WHERE b.customer_id = m.customer_id).',
      'Примените оконную функцию ROW_NUMBER() OVER (PARTITION BY m.order_id ORDER BY m.updated_at DESC) AS rn и во внешнем запросе отфильтруйте WHERE rn = 1.',
    ],
  },
  {
    id: 'sql-7',
    moduleSlug: 'sql',
    order: 7,
    title: 'Оконные фреймы под капотом: ROWS против RANGE, ловушка Peers и расчет скользящих метрик',
    estimatedMinutes: 35,
    glossaryTerms: [
      { term: 'Window Frame', definition: 'Оконный фрейм — границы подмножества строк внутри партиции, по которым агрегатная функция производит вычисление для текущей строки.' },
      { term: 'Peers', definition: 'Строки-дубликаты внутри партиции, имеющие идентичные значения в колонках сортировки ORDER BY.' },
      { term: 'Sliding Window', definition: 'Скользящее окно — динамический фрейм с фиксированной физической длиной (например, текущая строка и 2 предыдущие), скользящий вдоль временного ряда.' },
      { term: 'EXCLUDE Clause', definition: 'Конструкция стандарта SQL:2011, позволяющая исключать текущую строку (EXCLUDE CURRENT ROW) или группу дубликатов (EXCLUDE GROUP) из расчета фрейма.' },
      { term: 'Ring Buffer', definition: 'Кольцевой буфер — структура данных в памяти СУБД, используемая для сверхбыстрого вычисления скользящих средних по фрейму ROWS за O(1).' },
    ],
    schemaPreview: [
      {
        tableName: 'stock_trades',
        description: 'Журнал биржевых сделок по ценным бумагам',
        columns: [
          { name: 'trade_id', type: 'INT', keyType: 'PK' },
          { name: 'ticker', type: 'VARCHAR(10)' },
          { name: 'trade_date', type: 'DATE' },
          { name: 'price', type: 'NUMERIC(10,2)' },
          { name: 'shares', type: 'INT' },
        ],
        sampleRows: [
          { trade_id: 1, ticker: 'SBER', trade_date: '2026-10-01', price: 250.00, shares: 100 },
          { trade_id: 2, ticker: 'SBER', trade_date: '2026-10-02', price: 255.00, shares: 150 },
          { trade_id: 3, ticker: 'SBER', trade_date: '2026-10-02', price: 260.00, shares: 200 },
          { trade_id: 4, ticker: 'SBER', trade_date: '2026-10-03', price: 258.00, shares: 120 },
          { trade_id: 5, ticker: 'GAZP', trade_date: '2026-10-01', price: 130.00, shares: 300 },
        ],
      },
    ],
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Физика оконных фреймов: как движок СУБД перемещает курсор

Когда реляционная СУБД выполняет оконную функцию с секцией \`OVER (PARTITION BY ... ORDER BY ...)\`, оптимизатор строит физический план с оператором **\`WindowAgg\`** (или \`StreamingWindow\`).

Вычисление агрегата опирается на понятие **фрейма (Window Frame)** — подвижной рамки видимости строк:
\`\`\`sql
FUNCTION() OVER (
    PARTITION BY ticker 
    ORDER BY trade_date 
    [ROWS | RANGE] BETWEEN <frame_start> AND <frame_end>
)
\`\`\`

#### Принципиальная разница между ROWS и RANGE
1. **\`ROWS BETWEEN\` (Физические строки):**
   Оперирует строгим смещением по физическим строкам:
   * \`ROWS BETWEEN 2 PRECEDING AND CURRENT ROW\` означает: взять ровно 2 предшествующие физические записи в таблице и текущую строку (всего до 3 строк).
   * Вычисляется через высокопроизводительный **кольцевой буфер (Ring Buffer)** в оперативной памяти: при сдвиге курсора на одну позицию из суммы вычитается ушедшая строка и прибавляется новая за **$O(1)$** тактов CPU!

2. **\`RANGE BETWEEN\` (Логический диапазон значений):**
   Оперирует не физическими строками, а **значениями** в колонке \`ORDER BY\`.
   Если в таблице есть несколько строк с одинаковым значением (например, две сделки по акции SBER произошли в одну дату \`2026-10-02\`), СУБД считает эти строки **пирами (Peers)**.
   * \`RANGE\` обязан включить в расчет ВСЕ строки с совпадающим значением одновременно!

#### Смертоносная ловушка дефолтного фрейма
По стандарту ANSI SQL, если разработчик указал секцию \`ORDER BY\`, но не написал спецификацию фрейма:
\`\`\`sql
-- Кажется безобидным:
SUM(shares) OVER (PARTITION BY ticker ORDER BY trade_date)
\`\`\`
СУБД **неявно и принудительно** подставляет стандартный фрейм:
\`\`\`sql
RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
\`\`\`

**Последствия для продакшена:**
1. **Искажение цифр в аналитике:** Обе строки за \`2026-10-02\` получат одинаковую кумулятивную сумму, равную сумме на конец всего дня, вместо последовательного нарастания!
2. **Падение скорости в 10–50 раз:** Движок не может применить кольцевой буфер. Он вынужден на каждой строке сканировать вперед, чтобы проверить, нет ли впереди строк с таким же значением даты, материализуя группы в памяти.

#### Спецификаторы исключений EXCLUDE (SQL:2011)
В современных СУБД поддерживаются тонкие модификаторы исключений из фрейма:
* \`EXCLUDE CURRENT ROW\`: исключает саму текущую строку (удобно для расчета среднего по "соседям").
* \`EXCLUDE GROUP\`: исключает текущую строку и всех ее логических дубликатов (peers).
* \`EXCLUDE TIES\`: оставляет саму текущую строку, но исключает ее дубликаты.`,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Очередь за кофе и однофамильцы',
        content: `Представьте очередь в кофейне:
- **\`ROWS BETWEEN 1 PRECEDING AND CURRENT ROW\`**: Бариста смотрит на вас и на человека, стоящего ровно перед вами физически в очереди. Всегда ровно 2 человека, даже если он пришел на секунду раньше.
- **\`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\`**: Бариста смотрит на время чека. Если вы и еще 3 человека подошли к кассе в 10:00:00, бариста посчитает заказы всех четверых одновременно и назовет вам четверым одну общую сумму!`,
      },
      {
        type: 'before-after-table',
        data: {
          title: 'Сравнение поведения фреймов ROWS и RANGE при наличии одинаковых дат (Peers)',
          beforeDescription: 'Сделки по акции SBER (две сделки совершены в одну дату: 2026-10-02)',
          beforeColumns: ['trade_id', 'trade_date', 'shares'],
          beforeRows: [
            [1, '2026-10-01', 100],
            [2, '2026-10-02', 150],
            [3, '2026-10-02', 200],
            [4, '2026-10-03', 120],
          ],
          afterDescription: 'Результат: ROWS нарастает строго физически; дефолтный RANGE задваивает сумму на одинаковых датах!',
          afterColumns: ['trade_id', 'trade_date', 'shares', 'ROWS_total', 'RANGE_total (дефолт)'],
          afterRows: [
            [1, '2026-10-01', 100, 100, 100],
            [2, '2026-10-02', 150, 250, 450],
            [3, '2026-10-02', 200, 450, 450],
            [4, '2026-10-03', 120, 570, 570],
          ],
          highlightDiffIndices: [
            { row: 1, col: 4 },
          ],
        },
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Искажение тикового объема сделок из-за неявного RANGE фрейма',
        content: `В высокочастотной алготрейдинговой платформе аналитики рассчитывали 10-секундный скользящий объем сделок через \`SUM(volume) OVER (ORDER BY trade_ts)\`. 
Так как на ликвидных инструментах в одну миллисекунду происходят десятки сделок, дефолтный \`RANGE\` объединял их в группы, из-за чего алго-робот получил ложный сигнал о гигантском моментальном скачке объема и преждевременно закрыл прибыльные позиции.

**Правило:** Если в секции \`ORDER BY\` возможны повторяющиеся значения, ВСЕГДА явно пишите \`ROWS BETWEEN ...\`!`,
      },
      {
        type: 'callout',
        variant: 'interview',
        title: '🎯 Спросят на собесе: Какой оконный фрейм подставляется СУБД по умолчанию при наличии ORDER BY и чем это опасно?',
        content: `**Ответ:** 
При наличии \`ORDER BY\` стандартом ANSI SQL подставляется:
\`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\`.
Опасности:
1. **Логическая:** Если поле сортировки содержит дубликаты (peers), функция припишет одинаковый агрегат всем строкам с совпадающим ключом, исказив плавность нарастающего итога.
2. **Производительность:** Движок вынужден проверять последующие строки на равенство ключа, что отключает оптимизацию через потоковый кольцевой буфер и замедляет выполнение в разы на миллионах строк.`,
      },
    ],
    taskDescription: `Для таблицы биржевых сделок 'stock_trades' рассчитайте скользящие и кумулятивные показатели по каждой ценной бумаге ('ticker'):
1. 'ticker': тикер ценной бумаги.
2. 'trade_date': дата совершения сделки.
3. 'price': цена сделки.
4. 'moving_avg_3_trades': 3-строчное скользящее среднее цены сделки (текущая сделка и ровно 2 предшествующие физические сделки по данному тикеру: 'ROWS BETWEEN 2 PRECEDING AND CURRENT ROW'), округленное до 2 знаков после запятой через 'ROUND(..., 2)'.
5. 'running_total_shares': нарастающий итог объема купленных акций ('shares') от начала торгов по бумаге до текущей физической строки ('ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW').
Отсортируйте результат: по 'ticker' по возрастанию, затем по 'trade_date' по возрастанию, затем по 'trade_id' по возрастанию.`,
    seedCode: `CREATE TABLE stock_trades (
    trade_id INT PRIMARY KEY,
    ticker VARCHAR(10),
    trade_date DATE,
    price NUMERIC(10,2),
    shares INT
);

INSERT INTO stock_trades VALUES
(1, 'SBER', '2026-10-01', 250.00, 100),
(2, 'SBER', '2026-10-02', 255.00, 150),
(3, 'SBER', '2026-10-02', 260.00, 200),
(4, 'SBER', '2026-10-03', 258.00, 120),
(5, 'GAZP', '2026-10-01', 130.00, 300),
(6, 'GAZP', '2026-10-02', 135.00, 250);`,
    initialCode: `-- Рассчитайте скользящее среднее и нарастающий объем по фрейму ROWS
SELECT 
    ticker,
    trade_date,
    price,
    -- moving_avg_3_trades: AVG(price) OVER (...) с фреймом ROWS
    -- running_total_shares: SUM(shares) OVER (...) с фреймом ROWS
FROM stock_trades
ORDER BY ticker ASC, trade_date ASC, trade_id ASC;`,
    solutionCode: `SELECT 
    ticker,
    trade_date,
    price,
    ROUND(AVG(price) OVER (
        PARTITION BY ticker 
        ORDER BY trade_date, trade_id
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ), 2) AS moving_avg_3_trades,
    SUM(shares) OVER (
        PARTITION BY ticker 
        ORDER BY trade_date, trade_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total_shares
FROM stock_trades
ORDER BY ticker ASC, trade_date ASC, trade_id ASC;`,
    testConfig: {
      checkOrder: true,
      floatPrecision: 2,
      expectedRowCount: 6,
      expectedColumns: ['ticker', 'trade_date', 'price', 'moving_avg_3_trades', 'running_total_shares'],
    },
    brokenProdTask: {
      title: 'Инцидент #112: Искажение скользящей средней цены из-за дефолтного RANGE',
      incidentDescription: 'Младший аналитик рассчитал скользящую среднюю без указания ROWS фрейма, из-за чего строки с одинаковой датой сделки объединились в одну группу и выдали ложные значения цен.',
      buggyCode: `SELECT 
    ticker,
    trade_date,
    price,
    ROUND(AVG(price) OVER (
        PARTITION BY ticker 
        ORDER BY trade_date
        RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ), 2) AS moving_avg_3_trades,
    SUM(shares) OVER (
        PARTITION BY ticker 
        ORDER BY trade_date
        RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total_shares
FROM stock_trades
ORDER BY ticker ASC, trade_date ASC, trade_id ASC;`,
      fixHint: 'Замените логический фрейм RANGE на физический ROWS BETWEEN 2 PRECEDING AND CURRENT ROW и ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW.',
      solutionCode: `SELECT 
    ticker,
    trade_date,
    price,
    ROUND(AVG(price) OVER (
        PARTITION BY ticker 
        ORDER BY trade_date, trade_id
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ), 2) AS moving_avg_3_trades,
    SUM(shares) OVER (
        PARTITION BY ticker 
        ORDER BY trade_date, trade_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total_shares
FROM stock_trades
ORDER BY ticker ASC, trade_date ASC, trade_id ASC;`,
      testConfig: {
        checkOrder: true,
        floatPrecision: 2,
      },
    },
    hints: [
      'Для расчета скользящего среднего используйте фрейм ROWS BETWEEN 2 PRECEDING AND CURRENT ROW внутри OVER (PARTITION BY ticker ORDER BY trade_date, trade_id).',
      'Для нарастающего объема используйте фрейм ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW.',
      'Округлите среднюю цену с помощью ROUND(..., 2).',
    ],
  },
  {
    id: 'sql-8',
    moduleSlug: 'sql',
    order: 8,
    title: 'Временные смещения и сессионизация: LAG, LEAD, FIRST_VALUE и смертельная ловушка LAST_VALUE',
    estimatedMinutes: 40,
    glossaryTerms: [
      { term: 'Navigation Functions', definition: 'Навигационные функции (LAG, LEAD, FIRST_VALUE, LAST_VALUE) — семейство оконных функций для перемещения по строкам вперед и назад без соединения таблицы с самой собой.' },
      { term: 'LAST_VALUE Trap', definition: 'Классическая ошибка SQL: вызов LAST_VALUE() без явного фрейма возвращает значение текущей строки из-за дефолтного ограничения CURRENT ROW.' },
      { term: 'Sessionization', definition: 'Сессионизация — процесс объединения дискретных логов кликов или событий в непрерывные пользовательские сессии по порогу времени неактивности.' },
      { term: 'Lookahead Window', definition: 'Окно заглядывания вперед (UNBOUNDED FOLLOWING), позволяющее алгоритму считывать будущее состояние процесса из любой промежуточной строки.' },
      { term: 'Inactivity Threshold', definition: 'Порог неактивности (обычно 30 минут в веб-аналитике Google Analytics / Яндекс Метрика), превышение которого разделяет одну сессию на две разные.' },
    ],
    schemaPreview: [
      {
        tableName: 'web_clickstream',
        description: 'Сырые логи кликов пользователей в интернет-магазине',
        columns: [
          { name: 'event_id', type: 'INT', keyType: 'PK' },
          { name: 'session_id', type: 'INT', keyType: 'FK' },
          { name: 'event_time', type: 'TIMESTAMP' },
          { name: 'page_url', type: 'VARCHAR(100)' },
          { name: 'status', type: 'VARCHAR(20)' },
        ],
        sampleRows: [
          { event_id: 1, session_id: 1001, event_time: '2026-10-10 14:00:00', page_url: '/home', status: 'view' },
          { event_id: 2, session_id: 1001, event_time: '2026-10-10 14:02:30', page_url: '/catalog', status: 'view' },
          { event_id: 3, session_id: 1001, event_time: '2026-10-10 14:05:00', page_url: '/cart', status: 'checkout' },
          { event_id: 4, session_id: 1001, event_time: '2026-10-10 14:08:15', page_url: '/success', status: 'purchased' },
          { event_id: 5, session_id: 1002, event_time: '2026-10-10 15:00:00', page_url: '/home', status: 'view' },
        ],
      },
    ],
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Анатомия навигационных функций: как заглянуть в прошлое и будущее

В аналитических витринах данных постоянной задачей является отслеживание цепочек взаимодействий: откуда пришел пользователь, сколько секунд он провел на странице, и завершилась ли сессия успешной конверсией.

Для этого стандарт SQL предоставляет четыре функции:
1. **\`LAG(column, offset, default_value)\`:** Считывает значение из предшествующей строки со смещением \`offset\` (по умолчанию 1). Если предыдущей строки нет (начало партиции), возвращает \`default_value\`.
2. **\`LEAD(column, offset, default_value)\`:** Считывает значение из последующей строки (заглядывание в будущее).
3. **\`FIRST_VALUE(column)\`:** Возвращает значение первой строки текущего фрейма.
4. **\`LAST_VALUE(column)\`:** Возвращает значение последней строки текущего фрейма.

#### Смертоносная ловушка функции LAST_VALUE()
Самый частый вопрос на технических собеседованиях для выявления "ненастоящих сеньоров":
*«Почему запрос \`LAST_VALUE(status) OVER (PARTITION BY session_id ORDER BY event_time)\` возвращает текущий статус строки, а не финальный статус сессии?»*

**Глубокое объяснение физики реляционного движка:**
По стандарту ANSI SQL при наличии секции \`ORDER BY\` дефолтным фреймом всегда является:
\`\`\`sql
RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
\`\`\`
Посмотрите на конец этого диапазона: он заканчивается на **\`CURRENT ROW\`**!
Когда курсор находится на 2-й строке сессии (просмотр каталога), движок СУБД строит фрейм от первой строки до **текущей**. 
Для движка физически не существует строк впереди! Какая строка является "последней" в окне, которое заканчивается на текущей строке? Разумеется, **сама текущая строка**!

В итоге на шаге 1 \`LAST_VALUE\` вернет \`view\`, на шаге 2 — \`view\`, на шаге 3 — \`checkout\`, на шаге 4 — \`purchased\`. Вместо одного постоянного финального статуса сессии вы получаете бессмысленную копию текущего значения!

#### Лекарство: Расширение фрейма до конца партиции
Чтобы \`LAST_VALUE\` сработал корректно и увидел будущее состояние сессии, необходимо явно указать окну расшириться до конца партиции:
\`\`\`sql
LAST_VALUE(status) OVER (
    PARTITION BY session_id 
    ORDER BY event_time
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
\`\`\`
С конструкцией **\`UNBOUNDED FOLLOWING\`** окно охватывает партицию целиком от самого первого до самого последнего события, и \`LAST_VALUE\` на каждой строке возвращает истинный финальный статус (\`purchased\`).`,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Чтение детектива с закладкой',
        content: `Представьте, что вы читаете детектив и остановились на 50-й странице (\`CURRENT ROW\`). 
Если вас спросят: «Кто убийца в последней прочитанной главе?», вы назовете события 50-й страницы. 
Если вы хотите знать, чем закончится вся книга целиком, вы обязаны открыть эпилог на самой последней странице (\`UNBOUNDED FOLLOWING\`). Дефолтный фрейм SQL не позволяет заглянуть дальше вашей закладки.`,
      },
      {
        type: 'data-flow',
        data: {
          title: 'Границы видимости фрейма: дефолтная ловушка против явного UNBOUNDED FOLLOWING',
          nodes: [
            { id: 'start', label: 'UNBOUNDED PRECEDING', sublabel: 'Начало сессии (/home)', type: 'source', status: 'success' },
            { id: 'current', label: 'CURRENT ROW', sublabel: 'Текущий клик (/cart)', type: 'transform', status: 'warning' },
            { id: 'end', label: 'UNBOUNDED FOLLOWING', sublabel: 'Финальный клик (/success)', type: 'storage', status: 'success' },
          ],
          edges: [
            { from: 'start', to: 'current', label: 'Дефолтный фрейм обрывается здесь!', animated: false },
            { from: 'current', to: 'end', label: 'Требуется явный ROWS ... UNBOUNDED FOLLOWING', animated: true },
          ],
        },
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Нулевой LTV и ошибочный статус оттока из-за LAST_VALUE без UNBOUNDED FOLLOWING',
        content: `В продуктовой аналитике онлайн-кинотеатра маркетологи строили когортный анализ: для каждого действия пользователя определяли его финальный статус через год (\`active\` или \`churned\`). 
Аналитик применил \`LAST_VALUE(status) OVER (PARTITION BY user_id ORDER BY event_time)\`. 
Поскольку на ранних этапах пользователи имели статус \`trial\`, в витрину попали некорректные статусы, что занизило показатель удержания клиентов (Retention) на 60% и привело к необоснованному сокращению рекламных бюджетов.`,
      },
      {
        type: 'callout',
        variant: 'interview',
        title: '🎯 Спросят на собесе: Почему функция LAST_VALUE() возвращает значение текущей строки и как это исправить?',
        content: `**Ответ:** 
По стандарту ANSI SQL при наличии секции \`ORDER BY\` дефолтным фреймом является \`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\`. 
Поскольку верхняя граница окна зафиксирована на \`CURRENT ROW\`, текущая строка является последней строкой фрейма. 
Для исправления необходимо явно специфицировать границы фрейма до конца партиции:
\`ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING\` (либо использовать обратный \`FIRST_VALUE(col) OVER (ORDER BY ts DESC)\`).`,
      },
    ],
    taskDescription: `Для таблицы сырых логов веб-кликов 'web_clickstream' обогатите каждое событие сессии аналитическим контекстом:
1. 'session_id': идентификатор пользовательской сессии.
2. 'event_time': точное время события.
3. 'page_url': адрес посещенной страницы.
4. 'status': статус текущего действия.
5. 'prev_page': адрес предшествующей страницы в рамках данной сессии ('LAG'). Если текущая страница — первая в сессии, вывести строку 'START'.
6. 'landing_page': первая страница входа в сессию ('FIRST_VALUE').
7. 'final_session_status': итоговый статус завершения всей сессии ('LAST_VALUE' с явным расширением фрейма до конца партиции 'ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING').
Отсортируйте результат по 'session_id' по возрастанию, затем по 'event_time' по возрастанию.`,
    seedCode: `CREATE TABLE web_clickstream (
    event_id INT PRIMARY KEY,
    session_id INT,
    event_time TEXT,
    page_url TEXT,
    status TEXT
);

INSERT INTO web_clickstream VALUES
(1, 1001, '2026-10-10 14:00:00', '/home', 'view'),
(2, 1001, '2026-10-10 14:02:30', '/catalog', 'view'),
(3, 1001, '2026-10-10 14:05:00', '/cart', 'checkout'),
(4, 1001, '2026-10-10 14:08:15', '/success', 'purchased'),
(5, 1002, '2026-10-10 15:00:00', '/home', 'view'),
(6, 1002, '2026-10-10 15:01:20', '/catalog', 'abandoned');`,
    initialCode: `-- Напишите аналитический запрос с LAG, FIRST_VALUE и LAST_VALUE
SELECT 
    session_id,
    event_time,
    page_url,
    status,
    -- prev_page: LAG(..., 1, 'START')
    -- landing_page: FIRST_VALUE(...)
    -- final_session_status: LAST_VALUE(...) с фреймом UNBOUNDED FOLLOWING
FROM web_clickstream
ORDER BY session_id ASC, event_time ASC;`,
    solutionCode: `SELECT 
    session_id,
    event_time,
    page_url,
    status,
    LAG(page_url, 1, 'START') OVER (
        PARTITION BY session_id 
        ORDER BY event_time
    ) AS prev_page,
    FIRST_VALUE(page_url) OVER (
        PARTITION BY session_id 
        ORDER BY event_time
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS landing_page,
    LAST_VALUE(status) OVER (
        PARTITION BY session_id 
        ORDER BY event_time
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS final_session_status
FROM web_clickstream
ORDER BY session_id ASC, event_time ASC;`,
    testConfig: {
      checkOrder: true,
      floatPrecision: 2,
      expectedRowCount: 6,
      expectedColumns: ['session_id', 'event_time', 'page_url', 'status', 'prev_page', 'landing_page', 'final_session_status'],
    },
    brokenProdTask: {
      title: 'Инцидент #113: Сбой атрибуции конверсий из-за дефолтного фрейма в LAST_VALUE',
      incidentDescription: 'Младший дата-инженер вызвал LAST_VALUE(status) без указания границ фрейма, из-за чего на промежуточных кликах выводились промежуточные статусы вместо финального статуса сессии.',
      buggyCode: `SELECT 
    session_id,
    event_time,
    page_url,
    status,
    LAG(page_url, 1, 'START') OVER (
        PARTITION BY session_id 
        ORDER BY event_time
    ) AS prev_page,
    FIRST_VALUE(page_url) OVER (
        PARTITION BY session_id 
        ORDER BY event_time
    ) AS landing_page,
    LAST_VALUE(status) OVER (
        PARTITION BY session_id 
        ORDER BY event_time -- ❌ Ошибка: отсутствует ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS final_session_status
FROM web_clickstream
ORDER BY session_id ASC, event_time ASC;`,
      fixHint: 'Добавьте явную спецификацию фрейма: ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING.',
      solutionCode: `SELECT 
    session_id,
    event_time,
    page_url,
    status,
    LAG(page_url, 1, 'START') OVER (
        PARTITION BY session_id 
        ORDER BY event_time
    ) AS prev_page,
    FIRST_VALUE(page_url) OVER (
        PARTITION BY session_id 
        ORDER BY event_time
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS landing_page,
    LAST_VALUE(status) OVER (
        PARTITION BY session_id 
        ORDER BY event_time
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS final_session_status
FROM web_clickstream
ORDER BY session_id ASC, event_time ASC;`,
      testConfig: {
        checkOrder: true,
        floatPrecision: 2,
      },
    },
    hints: [
      'Для получения предыдущей страницы используйте функцию LAG(page_url, 1, "START") OVER (PARTITION BY session_id ORDER BY event_time).',
      'Для первой страницы входа используйте FIRST_VALUE(page_url) OVER (PARTITION BY session_id ORDER BY event_time ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING).',
      'Для финального статуса сессии критически важно указать фрейм ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING внутри OVER для функции LAST_VALUE(status).',
    ],
  },
  {
    id: 'sql-9',
    moduleSlug: 'sql',
    order: 9,
    title: 'Многомерные агрегации для BI-витрин: GROUPING SETS, ROLLUP, функция GROUPING() и условный FILTER',
    estimatedMinutes: 40,
    glossaryTerms: [
      { term: 'Multi-Dimensional Aggregation', definition: 'Многомерная агрегация — одновременный расчет метрик по нескольким иерархическим срезам данных за одно сканирование источника.' },
      { term: 'ROLLUP', definition: 'Конструкция ANSI SQL для иерархической агрегации (Группа -> Подгруппа -> Подытог -> Гранд-итог), генерирующая N + 1 уровень срезов.' },
      { term: 'CUBE', definition: 'Оператор построения полного многомерного куба, генерирующий все возможные комбинации измерений (2^N срезов).' },
      { term: 'GROUPING() Function', definition: 'Специальная функция стандарта SQL, возвращающая 1, если колонка свернута в подытог на текущей строке, и 0, если значение взято из сырых данных.' },
      { term: 'Conditional Aggregation', definition: 'Условная агрегация через синтаксис FILTER (WHERE ...) или CASE WHEN для расчета показателей по срезам без размножения строк.' },
    ],
    schemaPreview: [
      {
        tableName: 'sales_mart',
        description: 'Региональная витрина продаж товаров',
        columns: [
          { name: 'sale_id', type: 'INT', keyType: 'PK' },
          { name: 'region', type: 'VARCHAR(50)' },
          { name: 'category', type: 'VARCHAR(50)' },
          { name: 'amount', type: 'NUMERIC(10,2)' },
        ],
        sampleRows: [
          { sale_id: 1, region: 'Север', category: 'Электроника', amount: 120000.00 },
          { sale_id: 2, region: 'Север', category: 'Одежда', amount: 45000.00 },
          { sale_id: 3, region: 'Север', category: 'Электроника', amount: 80000.00 },
          { sale_id: 4, region: 'Юг', category: 'Электроника', amount: 95000.00 },
          { sale_id: 5, region: 'Юг', category: 'Одежда', amount: 60000.00 },
        ],
      },
    ],
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Архитектура многомерных отчетов: почему naive GROUP BY не подходит для BI

При построении дашбордов для руководства в Tableau, Power BI, Apache Superset или Metabase аналитикам требуются отчеты, в которых одновременно присутствуют:
1. Детальные строки (Продажи по конкретному региону и категории).
2. Промежуточные подытоги (Итого по региону «Север»).
3. Финальный гранд-итог (Общая выручка всей компании).

Если решать эту задачу наивно через несколько раздельных SQL-запросов, СУБД будет вынуждена сканировать многогигабайтную таблицу фактов **трижды**, создавая тройную нагрузку на диск и CPU.

#### Семейство операторов: GROUPING SETS, ROLLUP и CUBE
Стандарт ANSI SQL предоставляет декларативные инструменты для объединения нескольких уровней группировки в рамках одного прохода:

* **\`GROUPING SETS\`:** Позволяет вручную перечислить нужные комбинации измерений:
  \`\`\`sql
  GROUP BY GROUPING SETS (
      (region, category), -- уровень 1: детали
      (region),           -- уровень 2: подытог по региону
      ()                  -- уровень 3: гранд-итог
  )
  \`\`\`

* **\`ROLLUP(region, category)\`:** Автоматически разворачивает иерархию от самого детального уровня к общему итогу:
  $(region, category) \\to (region) \\to ()$.
  Для $N$ колонок генерирует ровно **$N + 1$** срез.

* **\`CUBE(region, category)\`:** Генерирует полный комбинаторный куб со всеми возможными пересечениями:
  $(region, category) \\to (region) \\to (category) \\to ()$.
  Для $N$ колонок генерирует **$2^N$** срезов.

#### Коварная ловушка NULL: как отличить подытог от реального значения
Когда движок генерирует строку подытога (например, сумму по региону «Север» по всем категориям), в колонке \`category\` подставляется значение **\`NULL\`**.

Но что произойдет, если в сырых данных у вас реально есть товары с не указанной категорией (\`category IS NULL\`)?
В отчете появятся две разные строки со значением \`NULL\`:
1. Реальные продажи товаров без категории в регионе «Север».
2. Строка общего подытога по региону «Север»!

**Решение — функция \`GROUPING(column)\`:**
* Возвращает **\`0\`**, если значение колонки взято из исходных данных (даже если там реальный \`NULL\`).
* Возвращает **\`1\`**, если значение сгенерировано реляционным движком как подытог (Subtotal/Grand Total)!
\`\`\`sql
SELECT 
    CASE WHEN GROUPING(region) = 1 THEN '-- ГРАНД-ИТОГ --' ELSE region END AS region,
    SUM(amount) AS total_revenue
FROM sales_mart
GROUP BY ROLLUP(region);
\`\`\`

#### Условная агрегация через FILTER (WHERE ...)
Вместо громоздких конструкций \`SUM(CASE WHEN ...)\` современный стандарт SQL поддерживает чистый предикативный фильтр агрегатов:
\`\`\`sql
SELECT 
    region,
    COUNT(*) AS total_orders,
    COUNT(*) FILTER (WHERE category = 'Электроника') AS electronics_orders,
    COUNT(*) FILTER (WHERE category = 'Одежда') AS clothing_orders
FROM sales_mart
GROUP BY region;
\`\`\``,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Чек из строительного гипермаркета',
        content: `Представьте длинный кассовый чек из Леруа Мерлен:
- Сначала идут отдельные товары (краска, кисть, гвозди) — это детальный уровень (\`DETAILED\`).
- Затем черта и строка: «Итого отдел сантехники: 14 500 руб» — это подытог (\`ROLLUP\`).
- В самом низу чека жирным шрифтом: «ВСЕГО К ОПЛАТЕ: 48 200 руб» — это гранд-итог (\`GRAND_TOTAL\`).`,
      },
      {
        type: 'before-after-table',
        data: {
          title: 'Иерархическая структура многомерного отчета со срезами и итогами',
          beforeDescription: 'Сырые транзакции по продажам в магазинах',
          beforeColumns: ['region', 'category', 'amount'],
          beforeRows: [
            ['Север', 'Одежда', 45000],
            ['Север', 'Электроника', 200000],
            ['Юг', 'Одежда', 60000],
            ['Юг', 'Электроника', 95000],
          ],
          afterDescription: 'Итоговая BI-витрина: детальные срезы, подытоги регионов и гранд-итог компании',
          afterColumns: ['region', 'category', 'total_revenue', 'agg_level'],
          afterRows: [
            ['Север', 'Одежда', 45000, 'DETAILED'],
            ['Север', 'Электроника', 200000, 'DETAILED'],
            ['Юг', 'Одежда', 60000, 'DETAILED'],
            ['Юг', 'Электроника', 95000, 'DETAILED'],
            ['Север', '-- ВСЕ КАТЕГОРИИ --', 245000, 'SUBTOTAL_REGION'],
            ['Юг', '-- ВСЕ КАТЕГОРИИ --', 155000, 'SUBTOTAL_REGION'],
            ['-- ВСЕ РЕГИОНЫ --', '-- ГРАНД-ИТОГ --', 400000, 'GRAND_TOTAL'],
          ],
          highlightDiffIndices: [
            { row: 4, col: 2 },
            { row: 5, col: 2 },
            { row: 6, col: 2 },
          ],
        },
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Реальный NULL в регионе посчитался как гранд-итог компании, исказив KPI',
        content: `В розничной сети маркетплейса при формировании финансового отчета с \`ROLLUP\` в таблицу заказов попали строки онлайн-заказов из мобильного приложения без физического региона (\`region IS NULL\`). 
BI-система интерпретировала строку с пустым регионом как общий итог всей компании, перезаписав глобальную выручку сети значением одной маленькой когорты онлайн-покупок.

**Правило:** При формировании сводных отчетов всегда заменяйте сгенерированные подытоги на явные строковые маркеры (например, \`-- ИТОГО --\`) и проверяйте признак группировки!`,
      },
      {
        type: 'callout',
        variant: 'interview',
        title: '🎯 Спросят на собесе: Чем ROLLUP отличается от CUBE и сколько срезов агрегации генерирует каждый из них для N измерений?',
        content: `**Ответ:** 
- **\`ROLLUP\`** рассчитывает строго иерархическую агрегацию слева направо (например: Страна $\\to$ Область $\\to$ Город $\\to$ Итог). Для $N$ колонок генерируется ровно **$N + 1$** срез.
- **\`CUBE\`** рассчитывает полный многомерный гиперкуб со всеми возможными сочетаниями колонок (включая неиерархические срезы, например: только Город без Страны). Для $N$ колонок генерируется **$2^N$** срезов. 
При $N = 10$ измерений CUBE сгенерирует $2^{10} = 1024$ прохода группировки, что моментально приведет к падению СУБД по таймауту.`,
      },
    ],
    taskDescription: `Сформируйте для BI-дашборда многоуровневый иерархический отчет по продажам из таблицы 'sales_mart' (детализация по регионам и категориям, подытоги по регионам и финальный гранд-итог):
1. 'region': наименование региона (или '-- ВСЕ РЕГИОНЫ --' для строки гранд-итога).
2. 'category': наименование категории (или '-- ВСЕ КАТЕГОРИИ --' для регионального подытога, '-- ГРАНД-ИТОГ --' для гранд-итога).
3. 'total_revenue': суммарная выручка ('ROUND(SUM(amount), 2)').
4. 'orders_count': общее количество заказов в данном срезе ('COUNT(*)').
5. 'agg_level': текстовый уровень агрегации:
   - 'DETAILED' — для детальных строк (регион + категория),
   - 'SUBTOTAL_REGION' — для подытогов по регионам,
   - 'GRAND_TOTAL' — для общего гранд-итога компании.
Отсортируйте итоговый отчет: сначала детальные строки ('DETAILED'), затем региональные подытоги ('SUBTOTAL_REGION'), затем гранд-итог ('GRAND_TOTAL'); внутри уровней сортируйте по 'region' по возрастанию и по 'category' по возрастанию.`,
    seedCode: `CREATE TABLE sales_mart (
    sale_id INT PRIMARY KEY,
    region VARCHAR(50),
    category VARCHAR(50),
    amount NUMERIC(10,2)
);

INSERT INTO sales_mart VALUES
(1, 'Север', 'Электроника', 120000.00),
(2, 'Север', 'Одежда', 45000.00),
(3, 'Север', 'Электроника', 80000.00),
(4, 'Юг', 'Электроника', 95000.00),
(5, 'Юг', 'Одежда', 60000.00);`,
    initialCode: `-- Сформируйте многоуровневый иерархический отчет через CTE и UNION ALL
WITH bi_cubing AS (
    -- 1. Срез DETAILED: GROUP BY region, category
    -- 2. Срез SUBTOTAL_REGION: GROUP BY region
    -- 3. Срез GRAND_TOTAL: общий итог
)
SELECT region, category, total_revenue, orders_count, agg_level
FROM bi_cubing
ORDER BY 
    CASE WHEN agg_level = 'GRAND_TOTAL' THEN 3 WHEN agg_level = 'SUBTOTAL_REGION' THEN 2 ELSE 1 END,
    region ASC,
    category ASC;`,
    solutionCode: `WITH bi_cubing AS (
    SELECT 
        region,
        category,
        ROUND(SUM(amount), 2) AS total_revenue,
        COUNT(*) AS orders_count,
        'DETAILED' AS agg_level
    FROM sales_mart
    GROUP BY region, category

    UNION ALL

    SELECT 
        region,
        '-- ВСЕ КАТЕГОРИИ --' AS category,
        ROUND(SUM(amount), 2) AS total_revenue,
        COUNT(*) AS orders_count,
        'SUBTOTAL_REGION' AS agg_level
    FROM sales_mart
    GROUP BY region

    UNION ALL

    SELECT 
        '-- ВСЕ РЕГИОНЫ --' AS region,
        '-- ГРАНД-ИТОГ --' AS category,
        ROUND(SUM(amount), 2) AS total_revenue,
        COUNT(*) AS orders_count,
        'GRAND_TOTAL' AS agg_level
    FROM sales_mart
)
SELECT region, category, total_revenue, orders_count, agg_level
FROM bi_cubing
ORDER BY 
    CASE WHEN agg_level = 'GRAND_TOTAL' THEN 3 WHEN agg_level = 'SUBTOTAL_REGION' THEN 2 ELSE 1 END,
    region ASC,
    category ASC;`,
    testConfig: {
      checkOrder: true,
      floatPrecision: 2,
      expectedRowCount: 7,
      expectedColumns: ['region', 'category', 'total_revenue', 'orders_count', 'agg_level'],
    },
    brokenProdTask: {
      title: 'Инцидент #114: Нарушение сортировки и структуры в сводном отчете',
      incidentDescription: 'Дата-инженер забыл обернуть многоуровневые срезы в общий CTE, из-за чего сортировка ORDER BY применилась только к последнему блоку UNION ALL, разрушив структуру финансового дашборда.',
      buggyCode: `SELECT 
    region,
    category,
    ROUND(SUM(amount), 2) AS total_revenue,
    COUNT(*) AS orders_count,
    'DETAILED' AS agg_level
FROM sales_mart
GROUP BY region, category
UNION ALL
SELECT 
    region,
    '-- ВСЕ КАТЕГОРИИ --' AS category,
    ROUND(SUM(amount), 2) AS total_revenue,
    COUNT(*) AS orders_count,
    'SUBTOTAL_REGION' AS agg_level
FROM sales_mart
GROUP BY region; -- ❌ Ошибка: отсутствует уровень GRAND_TOTAL и правильная глобальная сортировка`,
      fixHint: 'Оберните все 3 уровня агрегации (DETAILED, SUBTOTAL_REGION, GRAND_TOTAL) в CTE bi_cubing и отсортируйте по CASE выражению agg_level.',
      solutionCode: `WITH bi_cubing AS (
    SELECT 
        region,
        category,
        ROUND(SUM(amount), 2) AS total_revenue,
        COUNT(*) AS orders_count,
        'DETAILED' AS agg_level
    FROM sales_mart
    GROUP BY region, category

    UNION ALL

    SELECT 
        region,
        '-- ВСЕ КАТЕГОРИИ --' AS category,
        ROUND(SUM(amount), 2) AS total_revenue,
        COUNT(*) AS orders_count,
        'SUBTOTAL_REGION' AS agg_level
    FROM sales_mart
    GROUP BY region

    UNION ALL

    SELECT 
        '-- ВСЕ РЕГИОНЫ --' AS region,
        '-- ГРАНД-ИТОГ --' AS category,
        ROUND(SUM(amount), 2) AS total_revenue,
        COUNT(*) AS orders_count,
        'GRAND_TOTAL' AS agg_level
    FROM sales_mart
)
SELECT region, category, total_revenue, orders_count, agg_level
FROM bi_cubing
ORDER BY 
    CASE WHEN agg_level = 'GRAND_TOTAL' THEN 3 WHEN agg_level = 'SUBTOTAL_REGION' THEN 2 ELSE 1 END,
    region ASC,
    category ASC;`,
      testConfig: {
        checkOrder: true,
        floatPrecision: 2,
      },
    },
    hints: [
      'Создайте CTE bi_cubing с тремя блоками, объединенными через UNION ALL: детальный срез, региональный подытог и гранд-итог.',
      'В блоке регионального подытога укажите категорию как "-- ВСЕ КАТЕГОРИИ --", а agg_level как "SUBTOTAL_REGION".',
      'Во внешнем запросе отсортируйте результат с помощью конструкции CASE WHEN agg_level = "GRAND_TOTAL" THEN 3 WHEN agg_level = "SUBTOTAL_REGION" THEN 2 ELSE 1 END, region ASC, category ASC.',
    ],
  },
  {
    id: 'sql-10',
    moduleSlug: 'sql',
    order: 10,
    title: 'Идемпотентная загрузка витрин: UPSERT, обработка NULL в уникальных ключах и транзакционная перезапись',
    estimatedMinutes: 40,
    glossaryTerms: [
      { term: 'Idempotency', definition: 'Идемпотентность — свойство операции при повторном выполнении давать точно такой же результат, как и при первом запуске (f(f(x)) = f(x)), без дубликатов и сбоев.' },
      { term: 'UPSERT', definition: 'Гибридная операция UPDATE + INSERT: вставка новой строки либо обновление существующей при возникновении конфликта по первичному ключу или уникальному индексу.' },
      { term: 'EXCLUDED Pseudo-table', definition: 'Специальная псевдотаблица в конструкции ON CONFLICT DO UPDATE, содержащая входящие значения строки из текущего INSERT, вызвавшей конфликт.' },
      { term: 'NULLS NOT DISTINCT', definition: 'Опция стандарта SQL:2023 и PostgreSQL 15+, заставляющая уникальные индексы считать значения NULL равными друг другу для предотвращения скрытых дублей.' },
      { term: 'Write-Audit-Publish (WAP)', definition: 'Архитектурный паттерн надежной загрузки: данные пишутся в изолированную промежуточную партицию, проходят валидацию качества и атомарно подменяются в витрине.' },
    ],
    schemaPreview: [
      {
        tableName: 'client_balances',
        description: 'Целевая витрина актуальных клиентских балансов',
        columns: [
          { name: 'client_id', type: 'INT', keyType: 'PK' },
          { name: 'account_num', type: 'VARCHAR(20)' },
          { name: 'balance', type: 'NUMERIC(12,2)' },
          { name: 'status', type: 'VARCHAR(20)' },
          { name: 'updated_at', type: 'TIMESTAMP' },
        ],
        sampleRows: [
          { client_id: 1, account_num: 'ACC-001', balance: 50000.00, status: 'active', updated_at: '2026-10-01 10:00:00' },
          { client_id: 2, account_num: 'ACC-002', balance: 12000.00, status: 'frozen', updated_at: '2026-10-01 10:00:00' },
          { client_id: 3, account_num: 'ACC-003', balance: 75000.00, status: 'active', updated_at: '2026-10-02 12:00:00' },
        ],
      },
      {
        tableName: 'incoming_batch',
        description: 'Суточный пакет обновлений из процессинга (содержит изменения и новых клиентов)',
        columns: [
          { name: 'client_id', type: 'INT', keyType: 'PK' },
          { name: 'account_num', type: 'VARCHAR(20)' },
          { name: 'balance', type: 'NUMERIC(12,2)' },
          { name: 'status', type: 'VARCHAR(20)' },
          { name: 'updated_at', type: 'TIMESTAMP' },
        ],
        sampleRows: [
          { client_id: 1, account_num: 'ACC-001', balance: 65000.00, status: 'active', updated_at: '2026-10-03 15:30:00' },
          { client_id: 2, account_num: 'ACC-002', balance: 12000.00, status: 'active', updated_at: '2026-10-03 15:30:00' },
          { client_id: 4, account_num: 'ACC-004', balance: 33000.00, status: 'active', updated_at: '2026-10-03 15:30:00' },
        ],
      },
    ],
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Фундаментальный закон Data Engineering: Принцип идемпотентности

В распределенных системах передачи данных сбои — это не исключение, а неизбежная норма:
* Сетевые таймауты между Airflow и базой данных.
* Перезапуски упавших контейнеров в Kubernetes.
* Ручные перерасчеты исторических данных (**Backfill**) за прошлый месяц.

Если пайплайн данных не является идемпотентным, любой повторный запуск приведет к фатальным последствиям: либо к падению с ошибкой \`Unique constraint violation\`, либо — что в сто раз хуже — к тихому **размножению и задвоению финансовых строк**!

**Математическое определение:** 
Операция $f$ называется **идемпотентной**, если повторное ее применение к результату не меняет состояния системы:
$$f(f(x)) = f(x)$$

#### Механика UPSERT: INSERT ... ON CONFLICT DO UPDATE
В современных аналитических СУБД (PostgreSQL, SQLite, ClickHouse, Snowflake, Databricks) стандартом слияния изменений является операция **\`UPSERT\`**:

\`\`\`sql
INSERT INTO client_balances (client_id, account_num, balance, status, updated_at)
VALUES (1, 'ACC-001', 65000.00, 'active', '2026-10-03 15:30:00')
ON CONFLICT (client_id) DO UPDATE SET
    balance = EXCLUDED.balance,
    status = EXCLUDED.status,
    updated_at = EXCLUDED.updated_at;
\`\`\`

**Как работает псевдотаблица \`EXCLUDED\` под капотом:**
1. Движок СУБД пытается вставить строку в целевую таблицу.
2. Проверяется уникальный B-Tree индекс по полю \`client_id\`.
3. Если конфликта нет — строка физически записывается в страницу данных.
4. Если конфликт обнаружен — движок не падает с ошибкой, а обращается к служебной структуре **\`EXCLUDED\`**, в которой хранятся значения строки, которую мы пытались вставить, и применяет выражение обновления \`UPDATE SET\`!

#### Коварная ловушка: NULL в составных уникальных индексах
Представьте, что вы создали составной уникальный ключ для филиальной сети:
\`\`\`sql
CREATE UNIQUE INDEX idx_org_branch ON branches (org_id, branch_code);
\`\`\`
По стандарту ANSI SQL значение \`NULL\` не равно другому значению \`NULL\` (\`NULL != NULL\`). 
Поэтому если вы вставите две строки:
* \`(10, NULL)\`
* \`(10, NULL)\`
Большинство СУБД (включая PostgreSQL версий ниже 15) **НЕ посчитают их дубликатами** и пропустят обе строки в таблицу! 
Это классическая дыра безопасности данных, через которую в хранилища просачиваются миллионы дубликатов.

**Решение:**
В современном стандарте SQL:2023 и PostgreSQL 15+ всегда используйте явный модификатор:
\`\`\`sql
CREATE UNIQUE INDEX idx_org_branch ON branches (org_id, branch_code) NULLS NOT DISTINCT;
\`\`\`

#### Паттерн Write-Audit-Publish (WAP) и партиционная перезапись
Для тяжелых пакетных хранилищ (Data Lakehouse, Parquet, Iceberg, ClickHouse) построчный \`UPSERT\` может быть слишком медленным.
Вместо него применяется паттерн атомарной партиционной перезаписи:
\`\`\`sql
BEGIN TRANSACTION;
-- 1. Удаляем данные строго за расчетную дату
DELETE FROM sales_mart WHERE report_date = '2026-10-01';
-- 2. Вставляем заново пересчитанную партицию
INSERT INTO sales_mart SELECT * FROM staging_sales WHERE report_date = '2026-10-01';
COMMIT;
\`\`\`
Благодаря транзакционной изоляции ACID клиенты витрины никогда не увидят таблицу в пустом или полузагруженном состоянии.`,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Картотека в поликлинике',
        content: `Представьте регистратуру поликлиники:
- **Неидемпотентный подход (наивный INSERT)**: При каждом визите пациента регистратор заводит новую медицинскую карту. Через год у одного человека оказывается 15 разных карточек, а врач не видит истории болезней.
- **Идемпотентный подход (UPSERT)**: Регистратор ищет карточку по номеру паспорта (первичный ключ). Если карточка уже есть — он просто дописывает новый адрес и телефон (\`UPDATE\`). Если человека нет в базе — заводит новую карточку (\`INSERT\`). Сколько бы раз пациент ни обратился, у него всегда ровно одна актуальная карта.`,
      },
      {
        type: 'data-flow',
        data: {
          title: 'Архитектура идемпотентного слияния данных (UPSERT Pipeline)',
          nodes: [
            { id: 'batch', label: 'Incoming Batch', sublabel: 'Суточный пакет данных', type: 'source', status: 'success' },
            { id: 'check', label: 'Unique Index Check', sublabel: 'Проверка первичного ключа', type: 'transform', status: 'running' },
            { id: 'insert', label: 'Insert Path', sublabel: 'Новый клиент (ACC-004)', type: 'storage', status: 'idle' },
            { id: 'update', label: 'Update Path [EXCLUDED]', sublabel: 'Обновление баланса (ACC-001)', type: 'storage', status: 'idle' },
          ],
          edges: [
            { from: 'batch', to: 'check', animated: true },
            { from: 'check', to: 'insert', label: 'Конфликта нет', animated: true },
            { from: 'check', to: 'update', label: 'ON CONFLICT', animated: true },
          ],
        },
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Сбой ретрая в Airflow задвоил 25 миллионов финансовых записей',
        content: `Ночной DAG в Airflow упал из-за сетевого таймаута на шаге записи в ClickHouse после того, как вставил 15 млн строк. 
Airflow согласно политике ретраев перезапустил таску. Поскольку в коде использовался простой \`INSERT INTO ... SELECT\`, скрипт вставил еще 25 млн строк поверх уже записанных. Утром балансы всех счетов клиентов увеличились ровно в 2 раза, что вызвало остановку торгов на бирже.

**Правило:** Любой даг Airflow, пишущий в базу данных, обязан быть идемпотентным (через UPSERT, ReplacingMergeTree с FINAL или DELETE за целевую партицию перед вставкой)!`,
      },
      {
        type: 'callout',
        variant: 'interview',
        title: '🎯 Спросят на собесе: Что такое идемпотентность пайплайна и как гарантировать отсутствие дубликатов при падении ETL на середине?',
        content: `**Ответ:** 
Идемпотентность гарантирует, что многократный запуск пайплайна за один и тот же период дает один и тот же детерминированный результат без дублирования данных. 
Методы гарантии:
1. **UPSERT / MERGE:** Вставка с обновлением по естественному или суррогатному бизнес-ключу (\`ON CONFLICT DO UPDATE\`).
2. **Атомарная партиционная перезапись:** Выполнение \`DELETE WHERE partition_date = :date\` и \`INSERT\` внутри единой ACID-транзакции.
3. **Write-Audit-Publish (WAP):** Запись во временную таблицу/стейджинг, прогон проверок целостности (Data Quality tests), и атомарная подмена через \`ALTER TABLE SWAP / RENAME\`.`,
      },
    ],
    taskDescription: `Реализуйте идемпотентную синхронизацию суточного пакета клиентских балансов из таблицы 'incoming_batch' в целевую витрину 'client_balances':
1. Выполните идемпотентную операцию загрузки: если клиент уже существует в 'client_balances', обновите его баланс ('balance'), статус ('status') и время обновления ('updated_at'); если клиент новый — вставьте новую строку (используйте синтаксис 'INSERT OR REPLACE INTO' или 'INSERT ... ON CONFLICT').
2. Вторым запросом выберите итоговое состояние витрины 'client_balances' со всеми колонками: 'client_id', 'account_num', 'balance', 'status', 'updated_at'.
3. Отсортируйте итоговую выборку по 'client_id' по возрастанию.
*Проверка идемпотентности:* Ваш скрипт должен безошибочно выдавать строго один и тот же результат при многократном повторном запуске!`,
    seedCode: `CREATE TABLE client_balances (
    client_id INT PRIMARY KEY,
    account_num VARCHAR(20) NOT NULL,
    balance NUMERIC(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

INSERT INTO client_balances VALUES
(1, 'ACC-001', 50000.00, 'active', '2026-10-01 10:00:00'),
(2, 'ACC-002', 12000.00, 'frozen', '2026-10-01 10:00:00'),
(3, 'ACC-003', 75000.00, 'active', '2026-10-02 12:00:00');

CREATE TABLE incoming_batch (
    client_id INT PRIMARY KEY,
    account_num VARCHAR(20),
    balance NUMERIC(12,2),
    status VARCHAR(20),
    updated_at TIMESTAMP
);

INSERT INTO incoming_batch VALUES
(1, 'ACC-001', 65000.00, 'active', '2026-10-03 15:30:00'),
(2, 'ACC-002', 12000.00, 'active', '2026-10-03 15:30:00'),
(4, 'ACC-004', 33000.00, 'active', '2026-10-03 15:30:00');`,
    initialCode: `-- Напишите идемпотентный скрипт загрузки витрины (UPSERT)
-- 1. Синхронизация client_balances из incoming_batch
-- 2. Итоговая выборка из client_balances с сортировкой по client_id ASC;`,
    solutionCode: `INSERT OR REPLACE INTO client_balances (client_id, account_num, balance, status, updated_at)
SELECT client_id, account_num, balance, status, updated_at
FROM incoming_batch;

SELECT client_id, account_num, balance, status, updated_at
FROM client_balances
ORDER BY client_id ASC;`,
    testConfig: {
      checkOrder: true,
      floatPrecision: 2,
      expectedRowCount: 4,
      expectedColumns: ['client_id', 'account_num', 'balance', 'status', 'updated_at'],
    },
    brokenProdTask: {
      title: 'Инцидент #115: Падение повторного ночного пайплайна с ошибкой Unique Violation',
      incidentDescription: 'Дата-инженер написал загрузку через обычный неидемпотентный INSERT INTO, из-за чего при перезапуске упавшего пайплайна Airflow процесс свалился с фатальной ошибкой UNIQUE constraint failed: client_balances.client_id.',
      buggyCode: `INSERT INTO client_balances (client_id, account_num, balance, status, updated_at)
SELECT client_id, account_num, balance, status, updated_at
FROM incoming_batch; -- ❌ Ошибка: обычный INSERT падает при наличии дубликатов ключа!

SELECT client_id, account_num, balance, status, updated_at
FROM client_balances
ORDER BY client_id ASC;`,
      fixHint: 'Сделайте загрузку идемпотентной с помощью конструкции INSERT OR REPLACE INTO.',
      solutionCode: `INSERT OR REPLACE INTO client_balances (client_id, account_num, balance, status, updated_at)
SELECT client_id, account_num, balance, status, updated_at
FROM incoming_batch;

SELECT client_id, account_num, balance, status, updated_at
FROM client_balances
ORDER BY client_id ASC;`,
      testConfig: {
        checkOrder: true,
        floatPrecision: 2,
      },
    },
    hints: [
      'Для безопасной синхронизации существующих строк и вставки новых используйте команду INSERT OR REPLACE INTO client_balances (client_id, account_num, balance, status, updated_at).',
      'Заполните поля данными из входящего пакета с помощью SELECT client_id, account_num, balance, status, updated_at FROM incoming_batch.',
      'В конце скрипта выполните SELECT client_id, account_num, balance, status, updated_at FROM client_balances ORDER BY client_id ASC;.',
    ],
  },
];
