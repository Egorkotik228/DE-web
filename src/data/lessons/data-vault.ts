import { Lesson } from '@/types/course';

export const dataVaultLessons: Lesson[] = [
  {
    id: 'dv-1',
    moduleSlug: 'data-vault',
    order: 1,
    title: 'Стандарт Дэна Линстедта: Анатомия Hubs, Links и Satellites',
    estimatedMinutes: 35,
    glossaryTerms: [
      { term: 'Data Vault 2.0', definition: 'Методология проектирования корпоративных DWH, разделяющая бизнес-ключи (Hub), отношения (Link) и контекст (Sat) для параллельной загрузки.' },
      { term: 'Business Key', definition: 'Естественный уникальный идентификатор сущности в реальном мире (номер паспорта, ИНН, VIN-номер автомобиля).' },
      { term: 'Hash Key', definition: 'Детерминированный криптографический хэш (MD5 / SHA-256) от бизнес-ключа, используемый как первичный ключ в DV 2.0.' },
    ],
    schemaPreview: [
      {
        tableName: 'hub_customer',
        description: 'Хаб клиентов: регистрация уникальных бизнес-ключей',
        columns: [
          { name: 'hub_customer_hk', type: 'CHAR(64)', keyType: 'PK' },
          { name: 'customer_bk', type: 'VARCHAR(64)', keyType: 'BK' },
          { name: 'load_date', type: 'TIMESTAMP' },
          { name: 'record_source', type: 'VARCHAR(32)' },
        ],
        sampleRows: [
          { hub_customer_hk: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', customer_bk: 'CUST-10492', load_date: '2026-10-31 16:00:00', record_source: 'CRM_POSTGRES' },
        ],
      },
      {
        tableName: 'sat_customer_core',
        description: 'Сателлит клиента: контекст и история изменений',
        columns: [
          { name: 'hub_customer_hk', type: 'CHAR(64)', keyType: 'FK' },
          { name: 'load_date', type: 'TIMESTAMP', keyType: 'PK' },
          { name: 'hash_diff', type: 'CHAR(64)' },
          { name: 'first_name', type: 'VARCHAR(50)' },
          { name: 'last_name', type: 'VARCHAR(50)' },
          { name: 'email', type: 'VARCHAR(100)' },
          { name: 'record_source', type: 'VARCHAR(32)' },
        ],
        sampleRows: [
          { hub_customer_hk: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', load_date: '2026-10-31 16:00:00', hash_diff: '8f4c8996fb92427ae41e4649b934ca495991b7852b855e3b0c44298fc1c149af', first_name: 'Иван', last_name: 'Смирнов', email: 'ivan@example.com', record_source: 'CRM_POSTGRES' },
        ],
      },
    ],
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Почему Кимбалл ломается в Enterprise, и зачем придумали Data Vault

В небольших компаниях размерное моделирование по Ральфу Кимбаллу (витрины-«звезды» из фактов и измерений) работает прекрасно. Но когда корпорация разрастается до 50 разрозненных IT-систем (SAP, 1C, Salesforce, биллинг, мобильные приложения, микросервисы), классический подход заходит в тупик:

* **Постоянная ломка схем:** Если в CRM добавили поле или объединили таблицы клиентов, инженеру приходится переписывать половину витрин DWH.
* **Централизованное бутылочное горлышко:** Таблицы фактов Кимбалла требуют суррогатных ключей из центрального генератора. Потоки данных не могут загружаться параллельно — все ждут окончания загрузки измерений.
* **Утрата аудируемости:** Бизнес Кимбалла часто требует очистки и фильтрации «мусора». Если регулятор (ЦБ, налоговая) требует показать сырую транзакцию 3-летней давности, выясняется, что ее изменили при загрузке.

В ответ на эти вызовы Дэн Линстедт (Dan Linstedt) создал методологию **Data Vault 2.0**.

#### 3 базовых строительных блока Data Vault:

1. **Хаб (Hub — Бизнес-сущность):**
   * Содержит ТОЛЬКО уникальный список бизнес-ключей (Business Key: ИНН, client_id, vin_code).
   * **Никаких описательных атрибутов!** Имени, фамилии или адреса здесь нет.
   * Первичный ключ: **Hash Key (SHA-256)**, вычисленный от бизнес-ключа.
   * Колонки: \`hub_hash_key\` (PK), \`business_key\`, \`load_date\`, \`record_source\`.

2. **Линк (Link — Отношение и транзакции):**
   * Моделирует связь между двумя или более Хабами (отношения «многие-ко-многим» N:M).
   * Первичный ключ: собственный \`link_hash_key\`.
   * Внешние ключи: хэш-ключи связанных Хабов (\`hub_customer_hk\`, \`hub_store_hk\`).
   * В Data Vault связь между сущностями НИКОГДА не удаляется: линк строго append-only.

3. **Сателлит (Satellite — Контекст и история во времени):**
   * Хранит все описательные характеристики сущности (first_name, email, city, status).
   * Составной первичный ключ: (\`parent_hash_key\`, \`load_date\`).
   * Содержит поле **\`hash_diff\`** — хэш всех описательных полей строки, позволяющий мгновенно выявить факт изменения без поколоночного сравнения.

#### Революция Data Vault 2.0: Детерминированные хэш-ключи
В DV 2.0 отказались от sequence-генераторов баз данных. Хэш-ключ вычисляется до загрузки прямо на ETL-воркере:
\`\`\`sql
-- Формула Хаб-ключа в SQL:
SHA256(TRIM(UPPER(customer_id))) AS hub_customer_hk
\`\`\`
Поскольку хэш-функция детерминирована, воркер загрузки заказов может немедленно записать \`hub_customer_hk\` в таблицу Линка, даже если сам клиент еще физически не загрузился в таблицу Хаба! Загрузка становится **100% параллельной и масштабируемой**.`,
      },
      {
        type: 'er-diagram',
        data: {
          title: 'Каноническая архитектура Data Vault 2.0: Hub, Link и Satellites',
          description: 'Хаб хранит уникальный ключ, Линк объединяет сущности, Сателлиты хранят версионируемый контекст',
          tables: [
            {
              name: 'hub_customer',
              role: 'hub',
              comment: 'Регистрация клиентов',
              columns: [
                { name: 'hub_customer_hk', type: 'CHAR(64)', keyType: 'PK' },
                { name: 'customer_bk', type: 'VARCHAR(64)', keyType: 'BK' },
                { name: 'load_date', type: 'TIMESTAMP' },
                { name: 'record_source', type: 'VARCHAR(32)' },
              ],
            },
            {
              name: 'link_order_customer',
              role: 'link',
              comment: 'Связь Заказ -> Клиент',
              columns: [
                { name: 'link_order_cust_hk', type: 'CHAR(64)', keyType: 'PK' },
                { name: 'hub_order_hk', type: 'CHAR(64)', keyType: 'FK' },
                { name: 'hub_customer_hk', type: 'CHAR(64)', keyType: 'FK' },
                { name: 'load_date', type: 'TIMESTAMP' },
                { name: 'record_source', type: 'VARCHAR(32)' },
              ],
            },
            {
              name: 'sat_customer_details',
              role: 'satellite',
              comment: 'История изменений клиента',
              columns: [
                { name: 'hub_customer_hk', type: 'CHAR(64)', keyType: 'PK' },
                { name: 'load_date', type: 'TIMESTAMP', keyType: 'PK' },
                { name: 'hash_diff', type: 'CHAR(64)' },
                { name: 'full_name', type: 'VARCHAR(100)' },
                { name: 'phone', type: 'VARCHAR(20)' },
              ],
            },
          ],
          relationships: [
            { fromTable: 'hub_customer', fromColumn: 'hub_customer_hk', toTable: 'link_order_customer', toColumn: 'hub_customer_hk', cardinality: '1:N', label: 'участвует в заказах' },
            { fromTable: 'hub_customer', fromColumn: 'hub_customer_hk', toTable: 'sat_customer_details', toColumn: 'hub_customer_hk', cardinality: '1:N', label: 'исторический контекст' },
          ],
        },
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Описательные атрибуты внутри Хаба',
        content: `Грубейшая ошибка проектирования: добавить в Хаб \`hub_customer\` колонку \`email\` или \`status\`.
        
Почему это ломает Data Vault:
Хаб — это сущность, которая **никогда не обновляется (INSERT ONLY)**. Если у клиента сменится email или статус, обновить строку в Хабе невозможно — нарушится принцип неизменяемости Raw Vault.
        
**Правило:** Любой изменяемый атрибут обязан быть вынесен строго в **Сателлит**!`,
      },
      {
        type: 'callout',
        variant: 'interview',
        title: '🎯 Спросят на собесе: Почему в Data Vault используют SHA-256, а не MD5?',
        content: `Исторически в Data Vault 2.0 использовался алгоритм MD5 (128 бит), так как он компактен (16 байт бинарно) и быстро вычисляется. 
Однако в современных Enterprise-хранилищах с петабайтами данных (сотни миллиардов строк) вероятность коллизии хэшей (Birthday Paradox) в MD5 становится статистически значимой. Случайное совпадение хэшей двух разных клиентов приведет к катастрофической склейке чужих финансовых транзакций. Поэтому стандартом для критических хранилищ стал SHA-256 (256 бит), где вероятность коллизии пренебрежимо мала даже для триллионов строк.`,
      },
    ],
    taskDescription: `Напишите SQL-запрос для формирования данных загрузчика Хаба 'hub_customer' из таблицы сырого стейджинга 'stage_crm_clients'. 
Для каждого уникального 'client_id':
1. Сформируйте бизнес-ключ 'customer_bk' через TRIM(client_id).
2. Вычислите SHA-256 хэш-ключ 'hub_customer_hk' от выражения: UPPER(TRIM(client_id)). Используйте функцию SHA256(...) или MD5(...).
3. Добавьте текущую метку времени как 'load_date' и статический источник 'CRM_STAGE' как 'record_source'.
Дедуплицируйте по 'customer_bk' (каждый бизнес-ключ должен встретиться ровно один раз!). Отсортируйте по 'customer_bk'.`,
    seedCode: `CREATE TABLE stage_crm_clients (
    client_id VARCHAR(64),
    first_name VARCHAR(50),
    email VARCHAR(100)
);

INSERT INTO stage_crm_clients VALUES
(' CUST_001 ', 'Иван', 'ivan@test.ru'),
('CUST_002', 'Анна', 'anna@test.ru'),
('CUST_001', 'Иван', 'ivan@test.ru');`,
    initialCode: `-- Напишите запрос загрузки в Хаб
SELECT 
    -- hub_customer_hk
    -- customer_bk
    -- load_date
    -- record_source
FROM stage_crm_clients
-- Дедупликация и сортировка`,
    solutionCode: `SELECT DISTINCT
    MD5(UPPER(TRIM(client_id))) AS hub_customer_hk,
    TRIM(client_id) AS customer_bk,
    CURRENT_TIMESTAMP AS load_date,
    'CRM_STAGE' AS record_source
FROM stage_crm_clients
ORDER BY customer_bk;`,
    testConfig: {
      checkOrder: true,
      floatPrecision: 2,
      expectedRowCount: 2,
      expectedColumns: ['hub_customer_hk', 'customer_bk', 'load_date', 'record_source'],
    },
    brokenProdTask: {
      title: 'Инцидент #112: Регистр символов в client_id раздул Хаб дубликатами',
      incidentDescription: 'Из-за отсутствия функции UPPER() в формуле хэширования значения \'cust_10\' и \'CUST_10\' сгенерировали два разных хэша, породив дублирующие сущности одного клиента.',
      buggyCode: `SELECT DISTINCT
    MD5(TRIM(client_id)) as hub_customer_hk,
    TRIM(client_id) as customer_bk
FROM stage_crm_clients;`,
      fixHint: 'Всегда применяйте UPPER(TRIM(key)) перед вычислением криптографического хэша в Data Vault.',
      solutionCode: `SELECT DISTINCT
    MD5(UPPER(TRIM(client_id))) as hub_customer_hk,
    TRIM(client_id) as customer_bk
FROM stage_crm_clients;`,
      testConfig: {
        checkOrder: false,
        floatPrecision: 2,
      },
    },
    hints: [
      'Используйте SELECT DISTINCT для исключения дублирующихся строк из стейджинга.',
      'Формула хэша: MD5(UPPER(TRIM(client_id))) AS hub_customer_hk.',
      'Для временной метки используйте функцию CURRENT_TIMESTAMP AS load_date.',
    ],
  },
  {
    id: 'dv-2',
    moduleSlug: 'data-vault',
    order: 2,
    title: 'Выявление изменений через HashDiff и ускорение витрин с PIT-таблицами',
    estimatedMinutes: 40,
    glossaryTerms: [
      { term: 'HashDiff', definition: 'Контрольная сумма (хэш) от конкатенации всех описательных атрибутов Сателлита, используемая для мгновенного определения изменений строки.' },
      { term: 'PIT Table', definition: 'Point-In-Time таблица — предварительно рассчитанная матрица актуальных ключей сателлитов на регулярные временные срезы для ускорения JOIN в витринах.' },
      { term: 'Ghost Record', definition: 'Специальная служебная строка с хэш-ключом из нулей (-1 / 000...000) для обработки отсутствующих связей без NULL-джойнов.' },
    ],
    schemaPreview: [
      {
        tableName: 'sat_customer_bank',
        description: 'Сателлит с историей изменений статуса и баланса клиента',
        columns: [
          { name: 'hub_customer_hk', type: 'CHAR(32)', keyType: 'PK' },
          { name: 'load_date', type: 'TIMESTAMP', keyType: 'PK' },
          { name: 'hash_diff', type: 'CHAR(32)' },
          { name: 'risk_level', type: 'VARCHAR(10)' },
          { name: 'credit_limit', type: 'INT' },
        ],
        sampleRows: [
          { hub_customer_hk: 'c4ca4238a0b923820dcc509a6f75849b', load_date: '2026-10-01 10:00:00', hash_diff: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d', risk_level: 'LOW', credit_limit: 100000 },
          { hub_customer_hk: 'c4ca4238a0b923820dcc509a6f75849b', load_date: '2026-10-15 12:00:00', hash_diff: '9z8y7x6w5v4u3t2s1r0q9p8o7n6m5l4k', risk_level: 'HIGH', credit_limit: 10000 },
        ],
      },
    ],
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Детекция изменений на миллиардах строк: почему классический EXCEPT и OR мертвы

Когда ежедневно в корпоративное хранилище загружается инкремент из 20 000 000 строк клиентов, дата-инженер обязан ответить на вопрос: **какие именно строки изменились и требуют вставки новой исторической версии в Сателлит?**

Классический подход:
\`\`\`sql
-- ❌ АД ДЛЯ ОПТИМИЗАТОРА (Поколоночное сравнение 40 полей с обработкой NULL)
WHERE s.first_name IS DISTINCT FROM t.first_name
   OR s.last_name IS DISTINCT FROM t.last_name
   OR s.email IS DISTINCT FROM t.email
   OR s.phone IS DISTINCT FROM t.phone
   ... (еще 36 строчек)
\`\`\`
Такой запрос превращается в монструозный план выполнения, не способен использовать индексы и выполняется часами.

#### Оружие победы Data Vault: HashDiff
Вместо сравнения 40 колонок вычисляется единая контрольная сумма — **\`hash_diff\`**.
Все атрибуты очищаются от пробелов, приводятся к верхнему регистру, NULL заменяется специальным символом-разделителем (чтобы избежать коллизий склейки):

\`\`\`sql
-- Вычисление HashDiff:
MD5(
    COALESCE(TRIM(UPPER(risk_level)), '^^') || '||' ||
    COALESCE(TRIM(UPPER(credit_limit::TEXT)), '^^')
) AS hash_diff
\`\`\`

Теперь логика инкрементальной загрузки Сателлита тривиальна:
1. Вычисляем \`incoming.hash_diff\`.
2. Соединяем входящую порцию с Сателлитом строго по \`hub_hash_key\` и берем последнюю активную запись (\`latest_sat\`).
3. Если \`latest_sat.hub_hash_key IS NULL\` (новый клиент) ИЛИ \`incoming.hash_diff != latest_sat.hash_diff\` (клиент изменился) — выполняем **\`INSERT\`**.
4. Если \`incoming.hash_diff == latest_sat.hash_diff\` — данные не изменились, **строка просто игнорируется!**

#### Проблема сборки витрин и спасительные PIT (Point-In-Time) таблицы
У клиента в реальном DWH может быть 8 разных сателлитов:
* Сателлит из CRM (меняется раз в год)
* Сателлит скоринга риска (меняется раз в месяц)
* Сателлит баланса счета (меняется 50 раз в день)

Чтобы построить витрину по клиентам на конец каждого месяца за 3 года, без PIT базы данных пришлось бы делать 8 тяжелейших джойнов с оконными функциями \`MAX(load_date) <= snapshot_date\`. База ложится.

Таблица **PIT** заранее рассчитывает сетку срезов:
\`(hub_customer_hk, snapshot_date, sat_crm_load_date, sat_scoring_load_date, sat_balance_load_date)\`.
Теперь запрос витрины джойнит Сателлиты по готовым точным составным первичным ключам \`(hub_hk, load_date)\`, выполняясь за миллисекунды!`,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Контрольная пломба на контейнере',
        content: `Представьте морской грузовой контейнер, в котором лежит 500 разных товаров.
        
Поколоночный подход — это каждый раз открывать контейнер, доставать все 500 коробок, пересчитывать каждый болтик и сверять с описью.
        
Подход **HashDiff** — это наклеить на дверь контейнера номерную контрольную пломбу (хэш содержимого). Если на таможне номер пломбы совпадает со вчерашним — таможенник даже не трогает замок и пропускает контейнер за 1 секунду.`,
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Коллизия конкатенации без разделителя',
        content: `Опаснейший скрытый баг при вычислении HashDiff:
\`\`\`sql
-- ❌ Склейка без разделителя ||
MD5(first_name || last_name)
\`\`\`
Если у вас есть клиент «Иван» «Ов» и другой клиент «Ива» «Нов», их склеенные строки дадут одинаковое значение \`Иванов\`. Их HashDiff совпадет, и система ошибочно пропустит изменение данных!
        
**Правило:** Всегда использовать жесткий разделитель, который гарантированно не встречается в тексте (например, \`'^^' ||\`).`,
      },
      {
        type: 'callout',
        variant: 'interview',
        title: '🎯 Спросят на собесе: Зачем в сателлитах Data Vault хранить дату load_date в первичном ключе?',
        content: `Потому что Сателлит — это таблица, реализующая концепцию SCD Type 2 (полную историю изменений). 
Один и тот же Хаб-ключ (\`hub_customer_hk\`) встречается в Сателлите столько раз, сколько раз клиент менял свои данные (фамилию, номер телефона, баланс). 
Составной первичный ключ \`(hub_customer_hk, load_date)\` гарантирует уникальность каждой исторической версии записи и позволяет мгновенно адресовать снимок данных на любую миллисекунду в прошлом.`,
      },
    ],
    taskDescription: `Напишите запрос инкрементальной детекции изменений. У вас есть таблица входящих сырых данных 'incoming_customer_stage' и последняя актуальная версия сателлита 'current_sat_customer'. Вычислите 'incoming_hash_diff' для входящих данных от полей 'risk_level' и 'credit_limit' (через MD5(CONCAT(risk_level, '^^', credit_limit))). Отберите только те строки, которые являются НОВЫМИ (их нет в сателлите) ЛИБО у которых 'incoming_hash_diff != current_hash_diff'. Выведите 'hub_customer_hk', 'risk_level', 'credit_limit' и 'incoming_hash_diff'. Отсортируйте по 'hub_customer_hk'.`,
    seedCode: `CREATE TABLE incoming_customer_stage (
    hub_customer_hk VARCHAR(32),
    risk_level VARCHAR(10),
    credit_limit INT
);

CREATE TABLE current_sat_customer (
    hub_customer_hk VARCHAR(32) PRIMARY KEY,
    current_hash_diff VARCHAR(32)
);

INSERT INTO incoming_customer_stage VALUES
('hk_01', 'LOW', 50000),    -- Не изменился (хэш совпадет)
('hk_02', 'HIGH', 15000),   -- Изменился (новый риск)
('hk_03', 'MEDIUM', 30000); -- Новый клиент (нет в сателлите)

-- hk_01 уже имел в сателлите LOW и 50000:
INSERT INTO current_sat_customer VALUES
('hk_01', MD5('LOW^^50000')),
('hk_02', MD5('LOW^^20000'));`,
    initialCode: `-- Напишите запрос детекции изменений по HashDiff
WITH prepared_incoming AS (
    SELECT 
        hub_customer_hk,
        risk_level,
        credit_limit,
        -- incoming_hash_diff
    FROM incoming_customer_stage
)
SELECT 
    p.hub_customer_hk,
    p.risk_level,
    p.credit_limit,
    p.incoming_hash_diff
FROM prepared_incoming p
-- LEFT JOIN с current_sat_customer и фильтрация`,
    solutionCode: `WITH prepared_incoming AS (
    SELECT 
        hub_customer_hk,
        risk_level,
        credit_limit,
        MD5(CONCAT(risk_level, '^^', credit_limit)) AS incoming_hash_diff
    FROM incoming_customer_stage
)
SELECT 
    p.hub_customer_hk,
    p.risk_level,
    p.credit_limit,
    p.incoming_hash_diff
FROM prepared_incoming p
LEFT JOIN current_sat_customer c ON p.hub_customer_hk = c.hub_customer_hk
WHERE c.hub_customer_hk IS NULL OR p.incoming_hash_diff != c.current_hash_diff
ORDER BY p.hub_customer_hk;`,
    testConfig: {
      checkOrder: true,
      floatPrecision: 2,
      expectedRowCount: 2,
      expectedColumns: ['hub_customer_hk', 'risk_level', 'credit_limit', 'incoming_hash_diff'],
    },
    brokenProdTask: {
      title: 'Инцидент #113: INNER JOIN потерял всех новых клиентов в Data Vault',
      incidentDescription: 'Дата-инженер соединил входящие данные с сателлитом через INNER JOIN вместо LEFT JOIN, из-за чего в хранилище перестали добавляться новые пользователи.',
      buggyCode: `SELECT p.* 
FROM prepared_incoming p
JOIN current_sat_customer c ON p.hub_customer_hk = c.hub_customer_hk
WHERE p.incoming_hash_diff != c.current_hash_diff;`,
      fixHint: 'Используйте LEFT JOIN и условие (c.hub_customer_hk IS NULL OR p.incoming_hash_diff != c.current_hash_diff), чтобы включить новых клиентов.',
      solutionCode: `SELECT p.hub_customer_hk, p.risk_level, p.credit_limit, p.incoming_hash_diff
FROM prepared_incoming p
LEFT JOIN current_sat_customer c ON p.hub_customer_hk = c.hub_customer_hk
WHERE c.hub_customer_hk IS NULL OR p.incoming_hash_diff != c.current_hash_diff
ORDER BY p.hub_customer_hk;`,
      testConfig: {
        checkOrder: false,
        floatPrecision: 2,
      },
    },
    hints: [
      'Используйте CTE (WITH prepared_incoming AS (...)) для вычисления incoming_hash_diff.',
      'Формула хэша: MD5(CONCAT(risk_level, \'^^\', credit_limit)).',
      'Выполните LEFT JOIN с current_sat_customer и отфильтруйте: WHERE c.hub_customer_hk IS NULL OR p.incoming_hash_diff != c.current_hash_diff.',
    ],
  },
];
