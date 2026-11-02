import { TrackModule } from '@/types/course';

export const level4Modules: TrackModule[] = [
  {
    id: 'data-vault',
    slug: 'data-vault',
    title: 'Data Vault 2.0',
    shortDescription: 'Стандарт Дэна Линстедта: Hubs, Links, Satellites, хэш-ключи, HashDiff, PIT/Bridge и масштабируемый Raw Vault.',
    level: 4,
    levelTitle: 'Уровень 4: Enterprise Хранилища',
    engineType: 'schema-builder',
    dependencies: ['dwh', 'postgresql'],
    totalLessons: 8,
    curriculumTopics: [
      'Философия Data Vault 2.0: почему классический Кимбалл и 3NF ломаются в Enterprise',
      'Хабы (Hubs) и детерминированные HashKeys (MD5/SHA256, бизнес-ключи, collision prevention)',
      'Линки (Links): моделирование отношений M:N, транзакций и Same-As Links',
      'Сателлиты (Satellites): хранение версионного контекста, HashDiff и multi-active атрибуты',
      'Продвинутые конструкции: Effectivity Satellites, Hierarchical Links и Tombstones',
      'Оптимизация чтения: Point-in-Time (PIT) и Bridge таблицы',
      'Архитектура загрузки Data Vault: параллельность, идемпотентность и Set-Based Loading',
      'Business Vault и построение Information Mart (Звезда и Снежинка поверх Data Vault)',
    ],
    resumeBulletPoints: [
      'Проектирование и внедрение масштабируемых корпоративных хранилищ на базе стандарта Data Vault 2.0',
      'Разработка параллельных загрузчиков Raw Vault (Hub, Link, Sat) с вычислением Hash Key и HashDiff',
      'Оптимизация производительности витрин поверх Data Vault с помощью PIT и Bridge таблиц',
      'Обеспечение аудируемости и 100% воспроизводимости исторических данных корпоративного уровня',
    ],
    cheatSheetMarkdown: `### Data Vault 2.0: Шпаргалка архитектора

#### 1. Базовые сущности
* **Hub (Хаб):** Уникальный бизнес-ключ. Колонки: \`hub_hash_key\` (PK, SHA-256), \`business_key\`, \`load_date\`, \`record_source\`. Никаких описательных атрибутов!
* **Link (Линк):** Связь сущностей. Колонки: \`link_hash_key\` (PK), \`hub_1_hash_key\` (FK), \`hub_2_hash_key\` (FK), \`load_date\`, \`record_source\`.
* **Satellite (Сателлит):** Контекст и история. Колонки: \`parent_hash_key\` (PK part 1), \`load_date\` (PK part 2), \`hash_diff\` (хэш всех атрибутов для CDC), \`record_source\`, атрибуты (name, email, phone...).

#### 2. Формула HashDiff
\`\`\`sql
-- HashDiff позволяет мгновенно понять, изменился ли хоть один атрибут сущности:
SHA256(
    COALESCE(TRIM(UPPER(name)), '^^') || '||' ||
    COALESCE(TRIM(UPPER(email)), '^^') || '||' ||
    COALESCE(TRIM(UPPER(status)), '^^')
) AS hash_diff
\`\`\`

#### 3. Зачем нужны PIT (Point-in-Time) таблицы?
Сателлиты меняются с разной частотой (например, Sat_Customer раз в год, Sat_Customer_Status раз в день).
Чтобы соединить сущность с 5 сателлитами на определенную дату отчета, без PIT пришлось бы делать 5 тяжелых джойнов с оконными функциями \`MAX(load_date) <= report_date\`.
Таблица **PIT** предрассчитывает актуальные ключи сателлитов для каждого момента времени, превращая сложные подзапросы в обычные экви-джойны по готовым PK.`,
    interviewQuestions: [
      {
        id: 'dv-q1',
        question: 'Зачем в Data Vault 2.0 перешли с автоинкрементных sequence-ключей на хэш-ключи (MD5 / SHA-256)?',
        answer: 'В Data Vault 1.0 суррогатные ключи генерировались через централизованную базу (sequence). Это делало процесс загрузки строго последовательным (бутылочное горлышко): Link не мог загрузиться, пока не завершится генерация ID в Hub. В Data Vault 2.0 хэш-ключ вычисляется детерминированно из самого бизнес-ключа (например, SHA-256(TRIM(UPPER(client_id)))) на воркере Airflow/Spark до обращения к базе данных. Это позволяет загружать десятки Хабов, Линков и Сателлитов абсолютно параллельно и независимо друг от друга в распределенных системах.',
        level: 'Middle',
        tags: ['data-vault', 'hash-keys', 'parallel-loading'],
      },
      {
        id: 'dv-q2',
        question: 'Что такое HashDiff в сателлитах и как он ускоряет процесс CDC (Change Data Capture)?',
        answer: 'HashDiff — это криптографический хэш (MD5 или SHA-256) от конкатенации всех описательных атрибутов строки с приведением к верхнему регистру и обработкой NULL. При загрузке новой порции данных для каждого бизнес-ключа сравнивается пришедший HashDiff с HashDiff последней активной записи в сателлите. Если хэши совпадают — данные не изменились, запись пропускается. Если хэши отличаются — хотя бы одно поле изменилось, и в сателлит мгновенно вставляется новая историческая строка без необходимости поколоночного сравнения 30 полей через OR.',
        level: 'Junior',
        tags: ['data-vault', 'hashdiff', 'satellites'],
      },
      {
        id: 'dv-q3',
        question: 'Какую проблему решают PIT-таблицы (Point-In-Time) при формировании размерных витрин?',
        answer: 'В Data Vault у одной сущности (Хаба) может быть несколько сателлитов из разных систем с разной частотой изменений. Чтобы построить размерную витрину (Dim) на определенную дату, необходимо для каждого Хаба найти актуальную версию из каждого сателлита (подзапросы `WHERE load_date <= target_date ORDER BY load_date DESC LIMIT 1`). Соединение 5-7 сателлитов таким образом «убивает» производительность СУБД. PIT-таблица заранее материализует матрицу среза: (hub_key, snapshot_date, sat_1_load_date, sat_2_load_date...). Запрос к витрине соединяется с PIT по простому ключу, а из сателлитов забирает данные по точным первичным ключам.',
        level: 'Senior',
        tags: ['data-vault', 'pit', 'performance'],
      },
      {
        id: 'dv-q4',
        question: 'В чем разница между Raw Vault и Business Vault?',
        answer: 'Raw Vault — это точный слепок сырых данных источников, загруженный строго без применения бизнес-правил, фильтрации или очистки (только типизация и хэширование). Это гарантирует 100% аудит. Business Vault строится поверх Raw Vault и содержит вычисленные атрибуты, очищенные мастер-данные, бизнес-линки и дедуплицированные сущности (например, объединение дублирующихся клиентов из разных систем через Same-As Link). Если бизнес-логика изменится, Business Vault можно просто снести и пересчитать заново из Raw Vault.',
        level: 'Middle',
        tags: ['data-vault', 'raw-vault', 'business-vault'],
      },
      {
        id: 'dv-q5',
        question: 'Что такое Effectivity Satellite и когда он применяется?',
        answer: 'Обычный Линк фиксирует сам факт того, что отношение между сущностями когда-либо существовало (например, Клиент назначен на Менеджера). Но если Менеджер сменился, в Линке это отразить нельзя (он append-only). Для отслеживания актуальности связи создается Effectivity Satellite на Линк. Он содержит даты начала и окончания действия связи (valid_from, valid_to), фиксируя, какой именно Менеджер ведет Клиента в каждый момент времени.',
        level: 'Senior',
        tags: ['data-vault', 'effectivity-satellite', 'links'],
      },
    ],
  },
];
