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
];
