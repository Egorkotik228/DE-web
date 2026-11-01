import { Lesson } from '@/types/course';

export const postgresqlLessons: Lesson[] = [
  {
    id: 'postgres-under-the-hood',
    moduleSlug: 'postgresql',
    order: 1,
    title: 'PostgreSQL под капотом: MVCC, структура страницы Heap и чтение EXPLAIN ANALYZE',
    estimatedMinutes: 40,
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Физика хранения данных в PostgreSQL: Страницы, MVCC и Bloat

Каждая таблица в PostgreSQL физически хранится на диске в виде последовательности **страниц памяти (Pages / Blocks)** фиксированного размера (по умолчанию **8 КБ**).

#### Анатомия 8-килобайтной страницы (Page Layout)
- **PageHeaderData (24 байта):** метаданные страницы (LSN для WAL, смещения свободного места).
- **ItemId (Line Pointers):** массив 4-байтовых указателей, растущий *сверху вниз*. Каждый \`ItemId\` хранит смещение и длину кортежа (Tuple).
- **Free Space:** свободная область памяти между указателями и данными.
- **Tuples (Строки):** реальные данные строк, записываемые *снизу вверх*.
- **Кортеж \`ctid\`:** физический адрес строки на диске в формате \`(номер_страницы, номер_указателя)\` (например, \`(0, 1)\`).

#### Многоверсионность (MVCC: Multi-Version Concurrency Control)
В PostgreSQL чтение никогда не блокирует запись, а запись никогда не блокирует чтение! Как это достигается?
Каждая строка имеет скрытые системные поля:
- \`xmin\`: номер транзакции (XID), которая создала (INSERT) строку.
- \`xmax\`: номер транзакции, которая удалила (DELETE) или обновила (UPDATE) строку.

**Почему UPDATE в Postgres — это INSERT + DELETE?**
Когда вы выполняете \`UPDATE users SET status = 'active' WHERE id = 1\`, СУБД:
1. Не перезаписывает существующие байты на диске!
2. В старой строке проставляет \`xmax = current_xid\` (помечая ее мертвой).
3. В свободное место страницы вставляет **абсолютно новую строку** с \`xmin = current_xid\` и новым \`ctid\`.

Мертвые кортежи (Dead Tuples) остаются на диске, вызывая **раздувание таблиц (Table Bloat)**, пока фоновый процесс **VACUUM** не очистит указатели для повторного использования.`,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Корректор в тетради',
        content:
          'Представьте, что в бухгалтерской книге запрещено стирать ластиком. При любой ошибке бухгалтер зачеркивает старую запись красной ручкой (ставит xmax) и внизу страницы пишет новую строчку (xmin). Книга быстро толстеет (bloat), пока уборщица (VACUUM) не заменит исписанные листы на новые.',
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Долгие незакрытые транзакции (Idle in Transaction)',
        content:
          'Если аналитик открыл транзакцию в DBeaver (\`BEGIN;\`) и ушел на обед, \`AUTOVACUUM\` не имеет права очищать мертвые кортежи, созданные после старта этой транзакции. За 2 часа таблица заказов может разрастись с 10 ГБ до 150 ГБ и положить диск сервера!',
      },
    ],
    glossaryTerms: [
      { term: 'MVCC', definition: 'Механизм управления конкурентным доступом с помощью версионирования строк, предотвращающий взаимные блокировки читателей и писателей.' },
      { term: 'ctid', definition: 'Физический адрес кортежа (tuple) внутри таблицы, состоящий из номера страницы и индекса указателя (page_number, item_offset).' },
      { term: 'AUTOVACUUM', definition: 'Фоновый процесс PostgreSQL, освобождающий место от мертвых кортежей (dead tuples) и обновляющий статистику планировщика (ANALYZE).' },
    ],
    schemaPreview: [
      {
        tableName: 'raw_events',
        columns: [
          { name: 'id', type: 'INT', keyType: 'PK' },
          { name: 'user_id', type: 'INT' },
          { name: 'status', type: 'VARCHAR(20)' },
          { name: 'event_dts', type: 'TIMESTAMP' },
        ],
        sampleRows: [
          { id: 1, user_id: 101, status: 'NEW', event_dts: '2026-11-01 01:00:00' },
          { id: 2, user_id: 102, status: 'PROCESSED', event_dts: '2026-11-01 01:05:00' },
        ],
      },
    ],
    taskDescription:
      'Используя оконные функции и фильтрацию, напишите SQL-запрос, который для каждого пользователя (`user_id`) находит количество событий со статусом `PROCESSED` и вычисляет разницу во времени между первым и последним событием. Проверьте запрос через ядро SQLite/Postgres.',
    seedCode: `CREATE TABLE raw_events (id INT, user_id INT, status TEXT, event_dts TEXT);
INSERT INTO raw_events VALUES (1, 101, 'PROCESSED', '2026-11-01 01:00:00');
INSERT INTO raw_events VALUES (2, 101, 'PROCESSED', '2026-11-01 01:30:00');
INSERT INTO raw_events VALUES (3, 102, 'PROCESSED', '2026-11-01 02:00:00');
INSERT INTO raw_events VALUES (4, 102, 'NEW', '2026-11-01 02:15:00');`,
    initialCode: `-- Напишите агрегатный запрос для анализа событий пользователей:\nSELECT \n    user_id,\n    COUNT(*) AS total_processed\nFROM raw_events\nWHERE status = 'PROCESSED'\nGROUP BY user_id\nORDER BY user_id;`,
    solutionCode: `SELECT \n    user_id,\n    COUNT(*) AS total_processed\nFROM raw_events\nWHERE status = 'PROCESSED'\nGROUP BY user_id\nORDER BY user_id;`,
    testConfig: {
      checkOrder: true,
      floatPrecision: 2,
      requiredAstPatterns: ['GROUP BY', 'COUNT'],
    },
    brokenProdTask: {
      title: 'Авария: Зависание аналитического запроса из-за Seq Scan',
      incidentDescription:
        'P1 Incident: Запрос аналитиков выполняется 45 секунд вместо 10 мс. В плане EXPLAIN виден Seq Scan по таблице на 20 млн строк.',
      buggyCode: 'SELECT * FROM raw_events WHERE user_id = 101;',
      fixHint: 'Создайте индекс CREATE INDEX idx_user ON raw_events(user_id);',
      solutionCode: 'CREATE INDEX idx_user ON raw_events(user_id); SELECT * FROM raw_events WHERE user_id = 101;',
      testConfig: { checkOrder: false, floatPrecision: 2 },
    },
    hints: [
      'Отфильтруйте строки по status = "PROCESSED".',
      'Сгруппируйте результат по user_id с помощью GROUP BY.',
      'Посчитайте количество строк через COUNT(*).',
    ],
  },
];
