import { Lesson } from '@/types/course';

export const sqlLesson2: Lesson = {
  id: 'sql-2',
  moduleSlug: 'sql',
  order: 2,
  title: 'Агрегация данных с нуля: COUNT, SUM, AVG, MIN, MAX, GROUP BY и HAVING',
  estimatedMinutes: 25,
  glossaryTerms: [
    {
      term: 'Агрегатная функция',
      definition: 'Функция (COUNT, SUM, AVG, MIN, MAX), сворачивающая множество строк в одно итоговое скалярное значение.',
    },
    {
      term: 'GROUP BY',
      definition: 'Конструкция SQL, группирующая строки с одинаковыми значениями в указанных столбцах для раздельного вычисления агрегатов.',
    },
    {
      term: 'HAVING',
      definition: 'Секция фильтрации сгруппированных данных, работающая строго после вычисления агрегатных функций по сформированным группам.',
    },
    {
      term: 'Кардинальность группы',
      definition: 'Число уникальных комбинаций группировочных ключей, определяющее итоговое количество строк после сжатия.',
    },
  ],
  schemaPreview: [
    {
      tableName: 'sales',
      description: 'Транзакции розничных продаж по странам и категориям',
      columns: [
        { name: 'sale_id', type: 'INT', keyType: 'PK' },
        { name: 'country', type: 'VARCHAR(50)' },
        { name: 'category', type: 'VARCHAR(50)' },
        { name: 'amount', type: 'NUMERIC(10,2)' },
        { name: 'discount_code', type: 'VARCHAR(20)' },
      ],
      sampleRows: [
        { sale_id: 1, country: 'Germany', category: 'Laptops', amount: 5000.0, discount_code: 'TECH10' },
        { sale_id: 2, country: 'Germany', category: 'Smartphones', amount: 4500.0, discount_code: null },
        { sale_id: 3, country: 'Germany', category: 'Audio', amount: 9000.0, discount_code: 'SUMMER' },
        { sale_id: 4, country: 'USA', category: 'Laptops', amount: 8000.0, discount_code: null },
        { sale_id: 5, country: 'USA', category: 'Smartphones', amount: 6200.0, discount_code: 'PROMO' },
        { sale_id: 6, country: 'France', category: 'Audio', amount: 3200.0, discount_code: null },
      ],
    },
  ],
  theoryBlocks: [
    {
      type: 'markdown',
      content: `### Агрегация данных: Как свернуть миллионы строк в бизнес-метрики

В работе инженера данных редко требуется выгружать каждую сырую транзакцию. Бизнесу нужны агрегированные витрины: суммарный оборот, средний чек, количество уникальных пользователей.

#### Основные функции агрегации:
* \`COUNT(*)\` — подсчитывает общее число физических строк в группе.
* \`COUNT(column)\` — считает только строки, где \`column IS NOT NULL\` (пропуски игнорируются!).
* \`SUM(column)\` — сумма всех значений.
* \`AVG(column)\` — среднее арифметическое.
* \`MIN(column)\` / \`MAX(column)\` — минимум и максимум.

#### Как работает GROUP BY
Предложение \`GROUP BY\` берет таблицу и распределяет строки по «корзинам» с одинаковыми значениями ключа:
\`\`\`sql
SELECT 
    country,
    COUNT(*) AS total_sales,
    SUM(amount) AS total_revenue
FROM sales
GROUP BY country;
\`\`\`

**Железное правило ANSI SQL:** Любая колонка, указанная в блоке \`SELECT\`, обязана либо участвовать в агрегатной функции (\`SUM\`, \`COUNT\`), либо входить в секцию \`GROUP BY\`. Иначе СУБД вернет ошибку: *column must appear in the GROUP BY clause or be used in an aggregate function*.

#### WHERE против HAVING: В чем разница?
1. **\`WHERE\`:** фильтрует **сырые строки ДО** группировки. Не имеет доступа к агрегатам. Экономит RAM/CPU СУБД, отсекая мусорные данные до построения хэш-таблицы групп.
2. **\`HAVING\`:** фильтрует **готовые группы ПОСЛЕ** вычисления агрегатов (\`HAVING SUM(amount) > 10000\`).`,
    },
    {
      type: 'callout',
      variant: 'analogy',
      title: '💡 На пальцах: Сортировка яблок по садам',
      content: `Представьте партию яблок из трех разных садов. 

1. Сначала вы выбрасываете гнилые яблоки — это \`WHERE\` (фильтрация до подсчета).
2. Затем вы раскладываете оставшиеся яблоки по трем ящикам с названием сада — это \`GROUP BY garden\`.
3. В каждом ящике вы взвешиваете общий вес \`SUM(weight)\` и считаете средний диаметр \`AVG(size)\`.
4. В магазин вы отправляете только те ящики, где суммарный вес яблок больше 50 кг — это \`HAVING SUM(weight) > 50\`.`,
    },
    {
      type: 'before-after-table',
      data: {
        title: 'Агрегация продаж по странам с фильтрацией групп',
        beforeDescription: 'Сырые продажи по странам (Германия, США, Франция)',
        beforeColumns: ['country', 'category', 'amount'],
        beforeRows: [
          ['Germany', 'Laptops', '5000.00'],
          ['USA', 'Smartphones', '6200.00'],
          ['France', 'Audio', '3200.00'],
        ],
        afterDescription: 'Агрегированный результат: total_revenue > 10000',
        afterColumns: ['country', 'total_revenue', 'avg_check'],
        afterRows: [
          ['Germany', '18500.00', '4625.00'],
          ['USA', '14200.00', '2840.00'],
          ['', '', ''],
        ],
      },
    },
    {
      type: 'callout',
      variant: 'prod-danger',
      title: '⚠️ Грабли в проде: Фильтрация агрегата в WHERE уронила ночной дашборд',
      content: `Младший аналитик попытался отфильтровать страны с высокой выручкой через \`WHERE SUM(amount) > 10000\`. Скрипт мгновенно упал с фатальной ошибкой \`aggregate functions are not allowed in WHERE\`. 

Планировщик физически не может применить WHERE к результату агрегации, так как на этапе WHERE группы еще не сформированы в памяти процесса. Все фильтры по суммам и средним обязаны находиться в \`HAVING\`!`,
    },
    {
      type: 'callout',
      variant: 'interview',
      title: '🎯 Спросят на собесе: Можно ли использовать HAVING без GROUP BY?',
      content: `**Ответ:** Да! Если опустить предложение \`GROUP BY\`, то вся таблица считается одной общей группой. Например:
\`\`\`sql
SELECT AVG(salary) 
FROM employees 
HAVING AVG(salary) > 150000;
\`\`\`
Этот запрос вернет 1 строку со средней зарплатой, если среднее по всей компании выше 150 000, либо пустую выборку (0 строк), если условие не выполнено.`,
    },
  ],
  taskDescription: 'Напишите SQL-запрос для агрегации продаж по странам из таблицы sales:\n1. Выберите страну country.\n2. Посчитайте общее количество заказов COUNT(*) с псевдонимом sales_count.\n3. Посчитайте суммарную выручку SUM(amount) с псевдонимом total_revenue.\n4. Посчитайте средний чек ROUND(AVG(amount), 2) с псевдонимом avg_check.\n5. Исключите мелкие продажи меньше 1000.00 еще на этапе фильтрации строк (WHERE amount >= 1000.00).\n6. Сгруппируйте данные по стране (GROUP BY country).\n7. Оставьте только страны с итоговой выручкой строго больше 10000.00 (HAVING SUM(amount) > 10000.00).\n8. Отсортируйте результат по total_revenue по убыванию (DESC).',
  seedCode: `CREATE TABLE sales (
    sale_id INT PRIMARY KEY,
    country VARCHAR(50),
    category VARCHAR(50),
    amount NUMERIC(10,2),
    discount_code VARCHAR(20)
);

INSERT INTO sales VALUES
(1, 'Germany', 'Laptops', 5000.00, 'TECH10'),
(2, 'Germany', 'Smartphones', 4500.00, NULL),
(3, 'Germany', 'Audio', 9000.00, 'SUMMER'),
(4, 'USA', 'Laptops', 8000.00, NULL),
(5, 'USA', 'Smartphones', 6200.00, 'PROMO'),
(6, 'France', 'Audio', 3200.00, NULL),
(7, 'Germany', 'Accessories', 500.00, NULL);`,
  initialCode: `-- Выберите country, посчитайте sales_count, total_revenue, avg_check
-- Отфильтруйте amount >= 1000.00 в WHERE
-- Сгруппируйте по country
-- Оставьте выручку > 10000.00 через HAVING
-- Отсортируйте по total_revenue DESC
SELECT 
    country
FROM sales
-- WHERE, GROUP BY, HAVING, ORDER BY`,
  solutionCode: `SELECT 
    country,
    COUNT(*) AS sales_count,
    SUM(amount) AS total_revenue,
    ROUND(AVG(amount), 2) AS avg_check
FROM sales
WHERE amount >= 1000.00
GROUP BY country
HAVING SUM(amount) > 10000.00
ORDER BY total_revenue DESC;`,
  testConfig: {
    checkOrder: true,
    floatPrecision: 2,
    expectedRowCount: 2,
    expectedColumns: ['country', 'sales_count', 'total_revenue', 'avg_check'],
  },
  brokenProdTask: {
    title: 'Инцидент #102: Попытка фильтрации агрегатов в WHERE уронила ETL',
    incidentDescription: 'В ночном пайплайне расчета KPI запрос упал с ошибкой aggregate functions are not allowed in WHERE, так как аналитик поместил фильтрацию по сумме выручки в секцию WHERE.',
    buggyCode: `SELECT 
    country,
    COUNT(*) AS sales_count,
    SUM(amount) AS total_revenue,
    ROUND(AVG(amount), 2) AS avg_check
FROM sales
WHERE amount >= 1000.00 AND SUM(amount) > 10000.00
GROUP BY country
ORDER BY total_revenue DESC;`,
    fixHint: 'Перенесите условие SUM(amount) > 10000.00 из секции WHERE в секцию HAVING.',
    solutionCode: `SELECT 
    country,
    COUNT(*) AS sales_count,
    SUM(amount) AS total_revenue,
    ROUND(AVG(amount), 2) AS avg_check
FROM sales
WHERE amount >= 1000.00
GROUP BY country
HAVING SUM(amount) > 10000.00
ORDER BY total_revenue DESC;`,
    testConfig: {
      checkOrder: true,
      floatPrecision: 2,
      expectedRowCount: 2,
    },
  },
  hints: [
    'Фильтрация строк до агрегации (amount >= 1000.00) выполняется строго в секции WHERE.',
    'Колонка country должна быть указана в GROUP BY, а фильтрация по агрегату SUM(amount) > 10000.00 — в HAVING.',
    'Используйте ROUND(AVG(amount), 2) AS avg_check для точного округления среднего чека до сотых.',
  ],
};
