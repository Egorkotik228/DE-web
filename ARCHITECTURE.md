# DE ACADEMY — ТЕХНИЧЕСКИЙ И МЕТОДИЧЕСКИЙ СТАНДАРТ ПРОЕКТА

## 1. АРХИТЕКТУРНЫЕ ПРАВИЛА И ЗАПРЕТ НА ЗАГЛУШКИ (ANTI-LAZINESS RULES)
1. **Запрет на сокращения:** В коде строго запрещены комментарии `// TODO`, `// rest of code`, `...` или пустые функции-заглушки. Каждый файл и компонент пишется на 100% рабочим.
2. **SSR-безопасность:** Все компоненты, использующие `window`, `localStorage`, `Worker`, `Monaco Editor`, `WebAssembly` или хоткеи, обязаны иметь директиву `'use client'` в первой строке, а тяжелые браузерные модули (`@monaco-editor/react`) должны подгружаться через `next/dynamic` с `{ ssr: false }`.
3. **Инженерная глубина уроков (Минимум 450–700 слов чистой теории на каждый урок):**
   - Запрещены поверхностные определения из 2–3 предложений.
   - Каждый урок обязан раскрывать физику процесса под капотом (как данные лежат на диске/в памяти, как работают алгоритмы, почему возникают узкие места) и содержать:
     1. Блок `💡 На пальцах` (точная жизненная аналогия).
     2. Интерактивную визуальную схему (`er-diagram`, `data-flow` или `before-after-table`).
     3. Блок `⚠️ Грабли в проде` (разбор реальных аварий: OOM, размножение строк при JOIN, Bloat таблиц, Data Skew, забитые слоты воркеров, Small Files Problem).
     4. Блок `🎯 Спросят на собесе` (глубокий технический разбор вопроса уровня Junior+/Middle/Senior).
     5. Основное практическое задание + отдельный кейс `🔥 Сломанный прод` (`brokenProdTask`).

## 2. ДИЗАЙН-СИСТЕМА (DARK DEVELOPER UI БЕЗ УСТАЛОСТИ ДЛЯ ГЛАЗ)
- Эстетика профессиональных инструментов (Linear, Supabase, VS Code, GitHub Dark). Никаких кислотных неоновых градиентов и визуального шума.
- Цвета:
  - Основной фон рабочей области: `#0D1117` (глубокий матовый графит).
  - Фон верхней шапки (`Navbar`) и левого сайдбара (`Sidebar`): `#090C10` (темный сланец).
  - Фон карточек и панелей: `#151B23`.
  - Границы: `1px solid #21262D` (акцентные рамки пройденных/активных узлов: `1px solid #10B981` с деликатным свечением `shadow-[0_0_20px_rgba(16,185,129,0.12)]` и фоном `#0D211B`).
  - Текст: основной `#E6EDF3` (мягкий светло-серый), вторичный `#7D8590`.
- Шрифты: `Inter` для UI и чтения теории, `JetBrains Mono` для редактора кода, счетчиков (`14/20`), схем БД и терминала.
- Расположение профиля: Виджет профиля пользователя и счетчик стрика (`🔥 N дней`) находятся строго в правом верхнем углу `Navbar.tsx`.

## 3. ПРОТОКОЛ WEB WORKERS (`src/workers/`)
Выполнение кода изолировано в Web Workers с жестким таймаутом `5000 ms` (`worker.terminate()`):
- Request: `{ requestId: string, type: 'INIT' | 'RUN' | 'VERIFY', seedCode: string, userCode: string, testConfig?: TestConfig }`
- Response: `{ requestId: string, status: 'READY' | 'SUCCESS' | 'ERROR' | 'TIMEOUT', executionTimeMs: number, columns?: string[], rows?: any[][], stdout?: string, dagNodes?: any[], errorDetails?: { line?: number, friendlyMessage: string, rawError: string }, verification?: { passed: boolean, feedback: string } }`

## 4. МАТРИЦА ГЛУБИНЫ ПО ВСЕМ 17 РАЗДЕЛАМ СТЕКА (`curriculumSpec`)
1. `intro` (Введение): Роль DE, жизненный цикл данных, OLTP vs OLAP (строчное vs колоночное чтение на уровне диска), ETL vs ELT, Batch vs Streaming.
2. `sql` (SQL): Логический порядок выполнения (`FROM -> WHERE -> GROUP BY -> HAVING -> SELECT -> ORDER BY`), троичная логика `NULL`, все виды `JOIN` (`SELF`, `CROSS`, `LATERAL`), `UNION ALL` vs `UNION`, рекурсивные `CTE`, оконные функции и фреймы (`ROWS BETWEEN` vs `RANGE BETWEEN`), дедупликация (`ROW_NUMBER`), задача Gaps & Islands (`LAG/LEAD`).
3. `python` (Python для DE): Работа с памятью, итераторы и генераторы (`yield` для чтения файлов 50+ ГБ без OOM), работа с `datetime`/`timezone`/UTC, `requests` с пагинацией и ретраями (`Exponential Backoff`), валидация схем через `Pydantic`, `asyncio`, ООП-паттерны для коннекторов, `logging`.
4. `pandas` (Pandas & Polars): Векторизация против циклов, индексация, сложные агрегации, `merge`/`pivot_table`/`melt`, оптимизация памяти (downcasting типов `int64 -> int16`, `category`), чтение чанками (`chunksize`), переход на `Polars` (Lazy API и мультитрединг).
5. `postgresql` (PostgreSQL под капотом): Архитектура памяти (`shared_buffers`, `work_mem`), структура страницы (Heap, Tuple, `ctid`), `MVCC` (почему UPDATE создает новую строку), `Bloat` и работа `VACUUM`/`AUTOVACUUM`, `WAL` (Write-Ahead Log), индексы (`B-Tree`, `Hash`, `GIN`, `BRIN`), чтение `EXPLAIN (ANALYZE, BUFFERS)`, `Seq Scan` vs `Index Scan` vs `Bitmap Heap Scan`, алгоритмы `Nested Loop`, `Hash Join`, `Merge Join`, декларативное партиционирование.
6. `dwh` (Архитектура DWH): 3NF и BCNF, подходы Инмона (CIF) и Кимбалла (Dimensional Modeling), типы фактов (Transactional, Periodic Snapshot, Accumulating Snapshot, Factless) и измерений (Conformed, Junk, Degenerate, Role-Playing), историчность `SCD Type 0, 1, 2, 3, 4, 6`, слои `Stage -> ODS/DDS -> CDM` и `Medallion (Bronze/Silver/Gold)`.
7. `data-vault` (Data Vault 2.0): Стандарт Дэна Линстедта: бизнес-ключи, суррогатные хэш-ключи (`MD5`/`SHA-256`), `Hubs`, `Links`, `Satellites`, `HashDiff`, продвинутые сущности (`Same-As Links`, `Hierarchical Links`, `Non-historized Links`, `Multi-Active Satellites`, `Effectivity Satellites`), слой `Business Vault` и ускорение выборок через `PIT (Point-in-Time)` и `Bridge` таблицы.
8. `linux-git` (Linux & Git): Файловые дескрипторы, права `chmod/chown`, потоки `stdin/stdout/stderr`, пайпы, `grep/awk/sed/jq`, `cron`, `systemd`, `ssh`-туннелирование, Git-флоу для дата-команд (`rebase`, `cherry-pick`, разрешение конфликтов в миграциях).
9. `docker` (Docker & Compose): Namespaces и Cgroups, слои образов и кэширование, multi-stage `Dockerfile`, сети (`bridge`, `host`), `volumes`, `healthcheck` и оркестрация локального стека (`Postgres + Airflow + ClickHouse + MinIO`).
10. `airflow` (Apache Airflow): Архитектура (`Scheduler`, `Webserver`, `Workers`, `Executors`: Local/Celery/K8s), DAG, `TaskFlow API`, `XCom`, `Sensors` (`poke` vs `reschedule` mode), `Catchup` & `Backfill`, `Dynamic Task Mapping`, строгая идемпотентность пайплайнов (перезапись партиций за `logical_date`).
11. `dbt` (dbt & Data Quality): Материализации (`view`, `table`, `incremental`, `ephemeral`), инкрементальные стратегии (`append`, `delete+insert`, `merge`), Jinja-макросы, `snapshots` (SCD2), Data Quality (`Great Expectations` / `dbt tests`), паттерн `Write-Audit-Publish (WAP)`, `Data Contracts` и `Data Lineage`.
12. `formats-s3` (Форматы, S3 и Lakehouse): Внутреннее устройство `Parquet` (`Row Groups`, `Column Chunks`, `Pages`, `Footer`, `Predicate Pushdown`, `Dictionary/RLE` сжатие), сравнение с `ORC` и `Avro`, объектное хранилище `S3/MinIO`, архитектура `Apache Iceberg` и `Delta Lake` (`Manifests`, `ACID`, `Time Travel`, `Schema Evolution`, `Small Files Compaction`).
13. `hadoop` (Apache Hadoop): Архитектура `HDFS` (`NameNode`, `JournalNodes`, `ZKFC`, `DataNode`, блоки 128 МБ, репликация, `Rack Awareness`), `YARN` (`ResourceManager`, `NodeManager`, `ApplicationMaster`), фазы `MapReduce` (`Map -> Spill & Sort -> Shuffle -> Reduce`).
14. `spark` (Apache Spark / PySpark): Архитектура (`Driver`, `Executors`, `Slots`), `Catalyst Optimizer` и `Tungsten`, `Narrow` vs `Wide` трансформации, физика `Shuffle`, стратегии джойнов (`Broadcast Hash Join` vs `Sort Merge Join`), борьба с перекосом данных (`Data Skew` и `Key Salting`), `cache/persist`, `repartition` vs `coalesce`, `AQE`.
15. `clickhouse` (ClickHouse & MPP Greenplum): Shared-Nothing архитектура и дистрибуция в Greenplum; внутрянка ClickHouse: колоночное хранение на диске, разреженный первичный индекс (`Sparse Index`, гранулы по 8192 строки), движки `MergeTree`, `ReplacingMergeTree` (`FINAL`), `SummingMergeTree`, `AggregatingMergeTree`, `CollapsingMergeTree`, материализованные представления и мутации.
16. `kafka` (Apache Kafka & CDC Debezium): Брокеры, Топики, Партиции, сегменты лога, `Zero-Copy`, `Consumer Groups` и ребалансировка, ключи партиционирования, гарантии доставки (`acks=0/1/all`, `min.insync.replicas`, идемпотентный продюсер, транзакции `Exactly-Once`), паттерн `Transactional Outbox` и `CDC (Change Data Capture)` через `Debezium` (чтение `PostgreSQL WAL`).
17. `system-design` (Финальный босс: Data System Design): Проектирование End-to-End аналитических платформ под требования бизнеса (Lambda vs Kappa архитектура, расчет объемов диска/сети/RAM, выбор между ClickHouse/Spark/Iceberg/Kafka, отказоустойчивость и SLA).
