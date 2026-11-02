import { Lesson } from '@/types/course';

export const sqlLesson3: Lesson = {
  id: 'sql-3',
  moduleSlug: 'sql',
  order: 3,
  title: 'Связывание таблиц с нуля: Первичные и внешние ключи (PK/FK), INNER, LEFT и FULL JOIN',
  estimatedMinutes: 25,
  glossaryTerms: [
    {
      term: 'Первичный ключ (Primary Key)',
      definition: 'Уникальный идентификатор строки таблицы, не допускающий дубликатов и значений NULL.',
    },
    {
      term: 'Внешний ключ (Foreign Key)',
      definition: 'Колонка таблицы, ссылающаяся на первичный ключ другой таблицы для обеспечения ссылочной целостности.',
    },
    {
      term: 'INNER JOIN',
      definition: 'Внутреннее соединение, возвращающее только строки со строгим совпадением по ключу в обеих таблицах.',
    },
    {
      term: 'LEFT JOIN',
      definition: 'Левое внешнее соединение, сохраняющее все строки левой таблицы и дополняющее их NULL из правой при отсутствии пары.',
    },
  ],
  schemaPreview: [
    {
      tableName: 'users',
      description: 'Пользователи сервиса',
      columns: [
        { name: 'user_id', type: 'INT', keyType: 'PK' },
        { name: 'user_name', type: 'VARCHAR(100)' },
        { name: 'city', type: 'VARCHAR(50)' },
      ],
      sampleRows: [
        { user_id: 1, user_name: 'Елена', city: 'Москва' },
        { user_id: 2, user_name: 'Иван', city: 'Казань' },
        { user_id: 3, user_name: 'Алексей', city: 'Новосибирск' },
      ],
    },
  ],
  theoryBlocks: [
    {
      type: 'markdown',
      content: `### Реляционные связи: Почему данные разделяют на таблицы

В реляционных базах данных информацию нормализуют — разделяют на независимые сущности. Например, данные о пользователях хранятся в таблице \`users\`, а заказы — в \`orders\`. Это устраняет дублирование (имя и телефон клиента не нужно повторять в каждой покупке).

Связь между таблицами строится на ключах:
* **Primary Key (PK):** уникальный идентификатор в родительской таблице (\`users.user_id\`).
* **Foreign Key (FK):** ссылка в дочерней таблице (\`orders.user_id\`).

#### Виды соединений (JOIN)
\`\`\`sql
SELECT u.user_name, o.amount
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id;
\`\`\`

1. **\`INNER JOIN\`:** возвращает только те строки, для которых нашлось точное совпадение ключей в обеих таблицах. Если пользователь ничего не купил, он полностью исчезнет из выборки!
2. **\`LEFT JOIN\`:** сохраняет **ВСЕ строки из левой таблицы**. Если в правой таблице заказов нет, колонки правой таблицы заполняются \`NULL\`. Это ключевой инструмент для поиска «клиентов без заказов» или подсчета конверсии.
3. **\`FULL OUTER JOIN\`:** объединяет все строки из левой и правой таблиц, заполняя пропуски \`NULL\`.
4. **\`CROSS JOIN\`:** декартово произведение (каждая строка левой таблицы соединяется с каждой строкой правой).

#### Ловушка COUNT(*) при LEFT JOIN
Если у клиента нет заказов, при \`LEFT JOIN\` формируется одна строка вида:
\`(Елена, NULL, NULL)\`.
Если вы напишете \`COUNT(*)\`, СУБД посчитает эту строку и выдаст 1 (как будто заказ есть!). 
Чтобы получить честный 0, всегда агрегируйте по первичному ключу правой таблицы: \`COUNT(o.order_id)\`.`,
    },
    {
      type: 'callout',
      variant: 'analogy',
      title: '💡 На пальцах: Гости вечеринки и номерки гардероба',
      content: `Таблица пользователей — это список всех приглашенных гостей (\`users\`). Таблица заказов — это занятые номерки в гардеробе (\`orders\`).

* **\`INNER JOIN\`** оставляет только гостей в верхней одежде (тех, кто получил номерок). Гости налегке просто вычеркиваются из списков.
* **\`LEFT JOIN\`** оставляет абсолютно всех гостей: если номерок есть — видим его номер, а если гость пришел без куртки — напротив него стоит прочерк (\`NULL\`).`,
    },
    {
      type: 'before-after-table',
      data: {
        title: 'Объединение клиентов с заказами через LEFT JOIN',
        beforeDescription: 'Пользователи и сырые заказы до агрегации',
        beforeColumns: ['user_name', 'order_id', 'amount'],
        beforeRows: [
          ['Елена', '101', '5000.00'],
          ['Иван', '102', '3500.00'],
          ['Алексей', 'NULL', 'NULL'],
        ],
        afterDescription: 'Итоговая витрина: клиенты, число заказов и сумма',
        afterColumns: ['user_name', 'orders_count', 'total_spent'],
        afterRows: [
          ['Елена', '3', '14500.00'],
          ['Иван', '2', '8500.00'],
          ['Алексей', '0', '0.00'],
        ],
      },
    },
    {
      type: 'callout',
      variant: 'prod-danger',
      title: '⚠️ Грабли в проде: INNER JOIN потерял 30% новых клиентов в когортном анализе',
      content: `Маркетинг рассчитывал конверсию первой недели для новых регистраций. Разработчик соединил \`users\` и \`orders\` через \`INNER JOIN\`. Все 30% зарегистрированных пользователей, которые еще не совершили оплату, просто испарились из выборки. Отчет показал конверсию 100%, исказив экономику привлечения трафика.`,
    },
    {
      type: 'callout',
      variant: 'interview',
      title: '🎯 Спросят на собесе: В чем разница между COUNT(*) и COUNT(o.order_id) при LEFT JOIN?',
      content: `**Ответ:** \`COUNT(*)\` подсчитывает физические строки выборки. Если у пользователя нет заказов, при LEFT JOIN для него генерируется строка с \`NULL\` в колонках заказов. \`COUNT(*)\` посчитает эту строку и вернет 1 (ложное срабатывание). \`COUNT(o.order_id)\` вычисляет количество не-NULL значений в указанной колонке и корректно вернет 0.`,
    },
  ],
  taskDescription: 'Сформируйте витрину клиентов и их покупок на основе таблиц users и orders:\n1. Свяжите users (левая таблица) и orders (правая таблица) по ключам user_id через LEFT JOIN, чтобы не потерять клиентов без покупок.\n2. Выведите имя клиента user_name.\n3. Посчитайте количество совершенных заказов как orders_count (используйте COUNT(o.order_id), чтобы для пользователей без заказов значение равнялось 0).\n4. Рассчитайте общую сумму покупок как total_spent. Используйте COALESCE(SUM(o.amount), 0.00), чтобы заменить NULL на 0.00.\n5. Сгруппируйте результат по u.user_id и u.user_name.\n6. Отсортируйте по убыванию total_spent DESC, а при равенстве — по u.user_name ASC.',
  seedCode: `CREATE TABLE users (
    user_id INT PRIMARY KEY,
    user_name VARCHAR(100),
    city VARCHAR(50)
);

CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    user_id INT,
    amount NUMERIC(10,2)
);

INSERT INTO users VALUES
(1, 'Елена', 'Москва'),
(2, 'Иван', 'Казань'),
(3, 'Алексей', 'Новосибирск');

INSERT INTO orders VALUES
(101, 1, 5000.00),
(102, 1, 4500.00),
(103, 1, 5000.00),
(104, 2, 5000.00),
(105, 2, 3500.00);`,
  initialCode: `-- Свяжите users и orders через LEFT JOIN
-- Выведите user_name, orders_count (COUNT по ключу заказа) и total_spent (с COALESCE)
-- Сгруппируйте по u.user_id, u.user_name
-- Отсортируйте по total_spent DESC, u.user_name ASC
SELECT 
    u.user_name
FROM users u
-- LEFT JOIN orders o ON ...`,
  solutionCode: `SELECT 
    u.user_name,
    COUNT(o.order_id) AS orders_count,
    COALESCE(SUM(o.amount), 0.00) AS total_spent
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
GROUP BY u.user_id, u.user_name
ORDER BY total_spent DESC, u.user_name ASC;`,
  testConfig: {
    checkOrder: true,
    floatPrecision: 2,
    expectedRowCount: 3,
    expectedColumns: ['user_name', 'orders_count', 'total_spent'],
  },
  brokenProdTask: {
    title: 'Инцидент #103: Клиенты без покупок испарились из рассылки',
    incidentDescription: 'Для маркетинговой кампании реактивации требовалось выгрузить всех клиентов с суммой покупок. Аналитик использовал INNER JOIN, из-за чего клиенты без заказов были удалены из выборки.',
    buggyCode: `SELECT 
    u.user_name,
    COUNT(o.order_id) AS orders_count,
    SUM(o.amount) AS total_spent
FROM users u
INNER JOIN orders o ON u.user_id = o.user_id
GROUP BY u.user_id, u.user_name
ORDER BY total_spent DESC;`,
    fixHint: 'Замените INNER JOIN на LEFT JOIN и оберните SUM(o.amount) в COALESCE(..., 0.00).',
    solutionCode: `SELECT 
    u.user_name,
    COUNT(o.order_id) AS orders_count,
    COALESCE(SUM(o.amount), 0.00) AS total_spent
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
GROUP BY u.user_id, u.user_name
ORDER BY total_spent DESC, u.user_name ASC;`,
    testConfig: {
      checkOrder: false,
      floatPrecision: 2,
      expectedRowCount: 3,
    },
  },
  hints: [
    'Используйте конструкцию LEFT JOIN orders o ON u.user_id = o.user_id, чтобы сохранить пользователей без покупок.',
    'Чтобы для пользователей без покупок не получить 1 в подсчете, используйте COUNT(o.order_id), а не COUNT(*).',
    'Для замены возможных NULL в сумме на ноль используйте COALESCE(SUM(o.amount), 0.00) AS total_spent.',
  ],
};
