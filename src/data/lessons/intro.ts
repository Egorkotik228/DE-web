import { Lesson } from '@/types/course';

export const introLessons: Lesson[] = [
  {
    id: 'intro-1',
    moduleSlug: 'intro',
    order: 1,
    title: 'Анатомия хранения: Строчные (OLTP) против Колоночных (OLAP) СУБД',
    estimatedMinutes: 25,
    glossaryTerms: [
      { term: 'OLTP', definition: 'Online Transaction Processing — системы обработки коротких транзакций в реальном времени с высокой частотой записи и точечного чтения.' },
      { term: 'OLAP', definition: 'Online Analytical Processing — системы обработки аналитических запросов с агрегацией миллионов строк по небольшому набору колонок.' },
      { term: 'I/O Bottleneck', definition: 'Бутылочное горлышко дискового ввода-вывода, когда скорость выполнения запроса ограничена скоростью чтения байтов с накопителя.' },
      { term: 'SIMD', definition: 'Single Instruction, Multiple Data — векторные процессорные инструкции, обрабатывающие массив чисел за один такт CPU.' },
    ],
    schemaPreview: [
      {
        tableName: 'raw_web_clicks',
        description: 'Сырые события кликов пользователей интернет-магазина',
        columns: [
          { name: 'click_id', type: 'BIGINT', keyType: 'PK' },
          { name: 'user_id', type: 'BIGINT' },
          { name: 'session_id', type: 'VARCHAR(64)' },
          { name: 'page_url', type: 'VARCHAR(255)' },
          { name: 'duration_sec', type: 'INT' },
          { name: 'device_os', type: 'VARCHAR(32)' },
          { name: 'ip_address', type: 'VARCHAR(45)' },
          { name: 'created_at', type: 'TIMESTAMP' },
        ],
        sampleRows: [
          { click_id: 1, user_id: 1042, session_id: 's_9921', page_url: '/catalog/gpu', duration_sec: 14, device_os: 'macOS', ip_address: '192.168.1.1', created_at: '2026-10-31 12:00:01' },
          { click_id: 2, user_id: 2011, session_id: 's_8812', page_url: '/checkout', duration_sec: 45, device_os: 'Windows', ip_address: '10.0.0.4', created_at: '2026-10-31 12:00:02' },
          { click_id: 3, user_id: 1042, session_id: 's_9921', page_url: '/cart', duration_sec: 5, device_os: 'macOS', ip_address: '192.168.1.1', created_at: '2026-10-31 12:00:15' },
        ],
      },
    ],
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Физика дискового ввода-вывода: почему СУБД устроены по-разному

Каждый раз, когда аналитик запускает запрос вида \`SELECT AVG(duration_sec) FROM raw_web_clicks WHERE created_at >= '2026-10-01'\`, сервер базы данных должен поднять данные с постоянного накопителя (NVMe SSD или механический диск) в оперативную память.

Физический носитель оперирует не отдельными полями таблицы, а **блоками (страницами памяти)** фиксированного размера (например, 8 КБ в PostgreSQL или 4 КБ на уровне контроллера SSD). Если СУБД считывает байт с диска, она обязана прочитать страницу целиком.

В традиционных реляционных СУБД (**OLTP**, таких как PostgreSQL, MySQL, Oracle) данные хранятся **построчно** (Row-oriented). В одном блоке на диске последовательно лежат байты первой строки: \`click_id\`, затем \`user_id\`, \`session_id\`, тяжелый \`page_url\`, \`ip_address\` и \`created_at\`. Затем сразу начинается вторая строка.

Когда вы запрашиваете среднее значение всего по **одному** числовому столбцу \`duration_sec\` среди 100 000 000 строк, построчная база данных вынуждена поднять с диска в память ВСЕ 100 миллионов полных строк со всеми строковыми URL и IP-адресами. Если строка весит 250 байт, с диска будет считано 25 Гигабайт данных, хотя для самого вычисления среднего требовалось всего 400 Мегабайт (числа 4-байтового INT)! 98.4% прочитанного дискового трафика уходит в корзину. Это классическое **I/O Bottleneck** — бутылочное горлышко диска.

В аналитических хранилищах (**OLAP**, таких как ClickHouse, DuckDB, Snowflake, BigQuery) архитектура организована **поколоночно** (Columnar). На диске в смежных блоках лежат подряд значения ТОЛЬКО столбца \`duration_sec\`. Столбец \`page_url\` лежит в совершенно другом файле. Для выполнения аналитического запроса СУБД считывает строго файл нужной колонки.

Более того, однородные данные в колонке сжимаются в разы эффективнее: миллионы 4-байтовых целых чисел упаковываются алгоритмами RLE (Run-Length Encoding) и Gorilla в доли байта на значение. Диск отдает сжатый поток байт, а современный процессор распаковывает их на лету векторными инструкциями SIMD за такты CPU.`,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Библиотека с картотекой',
        content: `Представьте огромную библиотеку с миллионом читательских анкет. 

В **построчной системе (OLTP)** каждая анкета распечатана на отдельном листе A4: ФИО, паспорт, адрес, фото, возраст, список прочитанных книг. Если вам нужно узнать средний возраст читателей, библиотекарю придется взять миллион папок, перевернуть миллион страниц и на каждой найти строчку «Возраст».

В **колоночной системе (OLAP)** библиотекарь держит отдельные тетради: одна тетрадь содержит строго список фамилий, вторая — строго номера телефонов, а третья — только столбик чисел с возрастами всех читателей. Чтобы посчитать средний возраст, библиотекарь берет с полки одну тонкую тетрадь с возрастами и мгновенно суммирует цифры, даже не подходя к стеллажам с тяжелыми анкетами.`,
      },
      {
        type: 'data-flow',
        data: {
          title: 'Сравнение чтения блока с диска при расчете AVG(duration_sec)',
          description: 'Построчный подход вычитывает 98% мусорных полей, колоночный считывает ровно целевые байты',
          nodes: [
            { id: 'disk', label: 'NVMe Диск', sublabel: 'Блоки данных 8KB', type: 'storage' },
            { id: 'oltp-flow', label: 'OLTP Сканирование', sublabel: 'Чтение всех колонок: 25 ГБ I/O', type: 'transform', status: 'warning' },
            { id: 'olap-flow', label: 'OLAP Сканирование', sublabel: 'Чтение только duration_sec: 400 МБ I/O', type: 'transform', status: 'success' },
            { id: 'ram', label: 'RAM / CPU Cache', sublabel: 'SIMD векторизация', type: 'consumer' },
          ],
          edges: [
            { from: 'disk', to: 'oltp-flow', label: 'Строки целиком (I/O Spike)', animated: true, throughput: '25 GB' },
            { from: 'disk', to: 'olap-flow', label: 'Только колонка (Сжато)', animated: true, throughput: '90 MB' },
            { from: 'oltp-flow', to: 'ram', label: 'Отбрасывание 98% байт' },
            { from: 'olap-flow', to: 'ram', label: '100% полезных вычислений' },
          ],
        },
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Аналитика на боевом PostgreSQL',
        content: `Антипаттерн начинающих команд: подключить дашборд Metabase или Grafana напрямую к основной реплике продакшн-Postgres и запускать группировки по миллионам заказов каждые 30 секунд.
        
Что происходит:
1. Запрос вытесняет из кэша памяти (\`shared_buffers\`) горячие страницы активных транзакций пользователей интернет-магазина.
2. Возникает всплеск дисковой очереди (IOPS 100%), из-за чего обычные транзакции \`INSERT INTO orders\` начинают висеть по 5–15 секунд вместо 2 миллисекунд.
3. Пул соединений PgBouncer переполняется, и сайт интернет-магазина падает с ошибкой 504 Gateway Timeout.
        
**Правило архитектуры:** транзакционные базы (OLTP) изолируются от аналитических. Данные реплицируются через CDC (Debezium/Kafka) в выделенный OLAP-слой (ClickHouse / DWH).`,
      },
      {
        type: 'callout',
        variant: 'interview',
        title: '🎯 Спросят на собесе: Почему OLAP-базы непригодны для транзакций?',
        content: `**Вопрос:** Если колоночные базы так быстро читают данные, почему мы не используем ClickHouse вместо PostgreSQL для регистрации пользователей и оформления заказов?
        
**Ответ:** 
1. **Точечные вставки и обновления (Single-row INSERT/UPDATE):** В колоночной СУБД добавление одной строки требует открыть N разных файлов на диске (по числу колонок) и дописать в конец каждого по нескольку байт. Это порождает колоссальный Random Write I/O и лавину мелких кусков (parts).
2. **Отсутствие строгих блокировок и ACID:** Колоночные базы оптимизированы под вставку пачками (Batch Insert) по 50 000+ строк и не поддерживают построчные блокировки строк (\`SELECT FOR UPDATE\`), необходимые для списания денег со счета или бронирования остатка товара на складе.
3. **Чтение одной сущности целиком:** Запрос \`SELECT * FROM users WHERE id = 42\` в OLAP-базе соберет данные по кусочкам из 30 разных колоночных файлов, работая в десятки раз медленнее одного прямого Index Scan в PostgreSQL.`,
      },
    ],
    taskDescription: `Перед вами консоль аналитического движка. Напишите SQL-запрос, который рассчитывает среднюю длительность клика (duration_sec) с округлением до 2 знаков после запятой, максимальную длительность и общее число кликов из таблицы 'raw_web_clicks' для сессий пользователей macOS ('device_os = 'macOS''). Результат должен содержать колонки 'avg_duration', 'max_duration' и 'total_clicks'.`,
    seedCode: `-- Создание схемы и тестовых данных
CREATE TABLE raw_web_clicks (
    click_id BIGINT PRIMARY KEY,
    user_id BIGINT,
    session_id VARCHAR(64),
    page_url VARCHAR(255),
    duration_sec INT,
    device_os VARCHAR(32),
    ip_address VARCHAR(45),
    created_at TIMESTAMP
);

INSERT INTO raw_web_clicks VALUES
(1, 101, 's_1', '/home', 12, 'macOS', '192.168.1.1', '2026-10-31 10:00:00'),
(2, 102, 's_2', '/catalog', 35, 'Windows', '10.0.0.1', '2026-10-31 10:01:00'),
(3, 101, 's_1', '/cart', 8, 'macOS', '192.168.1.1', '2026-10-31 10:02:00'),
(4, 103, 's_3', '/item/42', 60, 'macOS', '172.16.0.5', '2026-10-31 10:05:00'),
(5, 104, 's_4', '/checkout', 110, 'Linux', '192.168.1.50', '2026-10-31 10:10:00');`,
    initialCode: `-- Рассчитайте агрегаты для пользователей macOS
SELECT 
    -- Ваш код здесь
FROM raw_web_clicks
WHERE device_os = 'macOS';`,
    solutionCode: `SELECT 
    ROUND(AVG(duration_sec), 2) AS avg_duration,
    MAX(duration_sec) AS max_duration,
    COUNT(*) AS total_clicks
FROM raw_web_clicks
WHERE device_os = 'macOS';`,
    testConfig: {
      checkOrder: false,
      floatPrecision: 2,
      expectedRowCount: 1,
      expectedColumns: ['avg_duration', 'max_duration', 'total_clicks'],
    },
    brokenProdTask: {
      title: 'Инцидент #104: Деление на ноль и NULL в аналитическом расчете',
      incidentDescription: 'В ночном отчете упал расчет среднего чека для мобильных устройств, потому что в таблицу попали сессии с нулевыми или неуказанными покупками, а запрос упал с ошибкой Division by Zero.',
      buggyCode: `SELECT 
    SUM(duration_sec) / COUNT(CASE WHEN duration_sec > 0 THEN 1 END) as avg_duration
FROM raw_web_clicks
WHERE device_os = 'iOS';`,
      fixHint: 'Используйте NULLIF(..., 0) или стандартную функцию AVG, которая корректно игнорирует NULL и защищает от деления на ноль при пустой выборке.',
      solutionCode: `SELECT 
    COALESCE(ROUND(AVG(duration_sec), 2), 0.00) as avg_duration
FROM raw_web_clicks
WHERE device_os = 'iOS';`,
      testConfig: {
        checkOrder: false,
        floatPrecision: 2,
      },
    },
    hints: [
      'Используйте встроенные агрегатные функции AVG(), MAX() и COUNT().',
      'Для округления среднего значения используйте ROUND(AVG(duration_sec), 2). Не забудьте псевдонимы колонок через AS.',
      'Итоговый запрос: SELECT ROUND(AVG(duration_sec), 2) AS avg_duration, MAX(duration_sec) AS max_duration, COUNT(*) AS total_clicks FROM raw_web_clicks WHERE device_os = \'macOS\';',
    ],
  },
  {
    id: 'intro-2',
    moduleSlug: 'intro',
    order: 2,
    title: 'Парадигмы обработки: Классический ETL против Современного ELT',
    estimatedMinutes: 30,
    glossaryTerms: [
      { term: 'ETL', definition: 'Extract, Transform, Load — подход, при котором трансформация данных происходит во внешнем вычислительном слое до сохранения в целевую БД.' },
      { term: 'ELT', definition: 'Extract, Load, Transform — подход, при котором сырые данные сначала загружаются в хранилище, а трансформация выполняется силами самого DWH.' },
      { term: 'Data Freshness', definition: 'Задержка между моментом возникновения события в источнике и его доступностью для аналитических запросов в DWH.' },
      { term: 'PII', definition: 'Personally Identifiable Information — персональные данные (паспорта, телефоны, email), требующие маскирования по закону.' },
    ],
    schemaPreview: [
      {
        tableName: 'stage_payments',
        description: 'Сырые платежные транзакции из шлюза оплат',
        columns: [
          { name: 'payment_id', type: 'VARCHAR(64)', keyType: 'PK' },
          { name: 'raw_amount_cents', type: 'BIGINT' },
          { name: 'currency', type: 'VARCHAR(3)' },
          { name: 'client_card_pan', type: 'VARCHAR(19)' },
          { name: 'raw_payload', type: 'TEXT' },
          { name: 'ingested_at', type: 'TIMESTAMP' },
        ],
        sampleRows: [
          { payment_id: 'p_881', raw_amount_cents: 150000, currency: 'RUB', client_card_pan: '4276********1092', raw_payload: '{"status":"ok"}', ingested_at: '2026-10-31 14:00:00' },
          { payment_id: 'p_882', raw_amount_cents: 34000, currency: 'RUB', client_card_pan: '2200********4411', raw_payload: '{"status":"ok"}', ingested_at: '2026-10-31 14:05:00' },
        ],
      },
    ],
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Эволюция архитектуры: почему мир перешел от ETL к ELT

Исторически, в эпоху традиционных реляционных СУБД (1990–2010 годы), вычислительные мощности и дисковое пространство хранилищ данных стоили чрезвычайно дорого. Запуск тяжелых трансформаций с джойнами и фильтрацией внутри самого DWH мог полностью парализовать генерацию отчетов для руководства.

Поэтому стандартом индустрии стал **ETL (Extract -> Transform -> Load)**:
1. **Extract (Извлечение):** Данные вычитываются из операционных баз (CRM, ERP, биллинг).
2. **Transform (Трансформация):** Данные передаются на выделенный промежуточный ETL-сервер (Informatica, скрипты на Python, кластер Spark). Там выполняются очистка, фильтрация, приведение типов, маскирование персональных данных и дедупликация.
3. **Load (Загрузка):** В целевое хранилище загружаются строго очищенные, готовые и агрегированные строки.

#### Почему классический ETL начал тормозить бизнес:
* **Потеря сырых данных:** Если через полгода бизнесу понадобилось поле, которое посчитали «ненужным» и отбросили на шаге Transform, восстановить историю невозможно — приходится заново подключаться к источникам и повторять весь процесс с нуля.
* **Узкое горлышко ETL-сервера:** Мощность промежуточного сервера ограничена. Если объем входящих данных вырос в 10 раз, ETL-сервер падает по памяти (OOM), а само хранилище простаивает в ожидании.
* **Длинный Time-to-Market:** Любое изменение логики требовало переписывания сложного кода конвейера и пересборки пайплайна.

#### Современная парадигма: ELT (Extract -> Load -> Transform)
С появлением масштабируемых облачных и распределенных колоночных СУБД (ClickHouse, BigQuery, Snowflake, DuckDB) стоимость хранения данных на диске приблизилась к нулю, а аналитические СУБД научились перемалывать терабайты данных за секунды.

В модели **ELT**:
1. **Extract:** Извлекаем сырые данные из источников.
2. **Load:** Без каких-либо преобразований сразу сбрасываем их как есть в сырой слой (Raw / Bronze / Stage) хранилища.
3. **Transform:** Трансформации выполняются **внутри самого аналитического хранилища** с помощью SQL-моделей (инструмент **dbt**).

#### Преимущества ELT:
* **Полная воспроизводимость:** Сырые данные сохранены навсегда. Если бизнес поменял формулу расчета маржинальности, достаточно изменить одну строчку в SQL-модели dbt и пересчитать витрины за все 5 лет.
* **Использование MPP-мощностей:** Хранилище трансформирует данные параллельно на сотнях ядер CPU быстрее любого отдельного Python-воркера.`,
      },
      {
        type: 'before-after-table',
        data: {
          title: 'Трансформация платежных транзакций в слое Silver/CDM',
          beforeDescription: 'Сырые данные (Stage layer): суммы в копейках, полные номера карт, сырой JSON',
          beforeColumns: ['payment_id', 'raw_amount_cents', 'client_card_pan', 'raw_payload'],
          beforeRows: [
            ['tx_01', 125000, '4276123456789012', '{"status":"paid","fee":150}'],
            ['tx_02', 45000, '5536987654321098', '{"status":"fraud_declined","fee":0}'],
          ],
          afterDescription: 'Аналитическая витрина (CDM layer): сумма в рублях, маскированная карта, статус очищен',
          afterColumns: ['payment_id', 'amount_rub', 'masked_card', 'status'],
          afterRows: [
            ['tx_01', 1250.00, '4276********9012', 'SUCCESS'],
            ['tx_02', 450.00, '5536********1098', 'DECLINED'],
          ],
          highlightDiffIndices: [
            { row: 0, col: 1 },
            { row: 0, col: 2 },
            { row: 1, col: 1 },
            { row: 1, col: 2 },
          ],
        },
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Утечка персональных данных (PII) в озеро данных',
        content: `При переходе на ELT инженеры часто совершают критическую ошибку: слепо выгружают таблицу клиентов из CRM прямо в общедоступный бакет S3 сырого слоя Data Lake.
        
В результате незашифрованные паспорта, номера телефонов и хеши паролей оказываются доступны десяткам дата-аналитиков и попадают в обучающие выборки ML-моделей. Это прямое нарушение 152-ФЗ и GDPR со штрафами до десятков миллионов рублей.
        
**Архитектурное решение:** Даже в парадигме ELT применяется микро-шаг **Data Masking / Tokenization** на лету: чувствительные поля маскируются или солятся хешем до записи в общий слой хранилища.`,
      },
      {
        type: 'callout',
        variant: 'interview',
        title: '🎯 Спросят на собесе: Когда классический ETL все еще предпочтительнее ELT?',
        content: `**Ответ кандидата уровня Middle+:**
1. **Строгая регуляторика и безопасность (Banking / Healthcare):** Когда данные медицинских карт или номера кредитных карт запрещено физически сохранять на общих аналитических серверах даже на 1 секунду.
2. **Экстремальный объем мусорного трафика (IoT / High-frequency Trading):** Если датчики присылают 5 миллиардов событий в сутки, из которых полезными являются только 0.1% аномалий, сохранение всех 99.9% шума в хранилище сделает счет за диски S3 нерентабельным. Фильтрация на ETL-воркере сокращает объем до загрузки.
3. **Ограничения целевой базы:** Если целевое хранилище не обладает собственными распределенными вычислительными мощностями (например, витрина отдается в MySQL / Redis), вся тяжелая трансформация обязана быть выполнена до загрузки.`,
      },
    ],
    taskDescription: `Вам поручено написать SQL-трансформацию (шаг Transform в ELT) для сырых платежей из таблицы 'stage_payments'. Сформируйте чистую витрину со следующими правилами: 
1. Переведите сумму 'raw_amount_cents' в рубли (разделив на 100.0) как 'amount_rub'.
2. Замаскируйте номер карты 'client_card_pan', оставив первые 4 и последние 4 цифры, а средние заменив на 8 звездочек: '4276********1092' (используйте SUBSTRING / конкатенацию). Назовите поле 'masked_card'.
3. Отфильтруйте только платежи в валюте 'RUB'.
Отсортируйте по 'amount_rub' по убыванию.`,
    seedCode: `CREATE TABLE stage_payments (
    payment_id VARCHAR(64) PRIMARY KEY,
    raw_amount_cents BIGINT,
    currency VARCHAR(3),
    client_card_pan VARCHAR(19),
    raw_payload TEXT,
    ingested_at TIMESTAMP
);

INSERT INTO stage_payments VALUES
('p_1', 250000, 'RUB', '4276123456781092', '{"status":"ok"}', '2026-10-31 12:00:00'),
('p_2', 1500, 'USD', '5536123456784411', '{"status":"ok"}', '2026-10-31 12:01:00'),
('p_3', 75000, 'RUB', '2200987654329988', '{"status":"ok"}', '2026-10-31 12:05:00');`,
    initialCode: `-- Напишите ELT трансформацию для слоя витрин
SELECT 
    payment_id,
    -- amount_rub
    -- masked_card
FROM stage_payments
-- Условия фильтрации и сортировки`,
    solutionCode: `SELECT 
    payment_id,
    ROUND(raw_amount_cents / 100.0, 2) AS amount_rub,
    CONCAT(SUBSTRING(client_card_pan, 1, 4), '********', SUBSTRING(client_card_pan, 13, 4)) AS masked_card
FROM stage_payments
WHERE currency = 'RUB'
ORDER BY amount_rub DESC;`,
    testConfig: {
      checkOrder: true,
      floatPrecision: 2,
      expectedRowCount: 2,
      expectedColumns: ['payment_id', 'amount_rub', 'masked_card'],
    },
    brokenProdTask: {
      title: 'Инцидент #105: Целочисленное деление в SQL уничтожило копейки',
      incidentDescription: 'После релиза новой модели dbt финансовый отдел обнаружил расхождение на 1.4 миллиона рублей: выражение raw_amount_cents / 100 при делении целых чисел в PostgreSQL отбрасывало дробную часть (копейки)!',
      buggyCode: `SELECT 
    payment_id,
    raw_amount_cents / 100 as amount_rub
FROM stage_payments;`,
      fixHint: 'При делении целого числа на целое PostgreSQL выполняет integer division. Делите на 100.0 или явно приводите тип к NUMERIC.',
      solutionCode: `SELECT 
    payment_id,
    ROUND(raw_amount_cents / 100.0, 2) as amount_rub
FROM stage_payments;`,
      testConfig: {
        checkOrder: false,
        floatPrecision: 2,
      },
    },
    hints: [
      'Делите на 100.0 (с точкой), чтобы избежать целочисленного деления без остатка.',
      'Для склеивания строк в PostgreSQL используйте функцию CONCAT() или оператор ||.',
      'Маскирование карты: CONCAT(SUBSTRING(client_card_pan, 1, 4), \'********\', SUBSTRING(client_card_pan, 13, 4)).',
    ],
  },
];
