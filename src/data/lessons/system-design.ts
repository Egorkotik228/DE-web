import { Lesson } from '@/types/course';

export const systemDesignLessons: Lesson[] = [
  {
    id: 'system-design-fintech',
    moduleSlug: 'system-design',
    order: 1,
    title: 'Data System Design: High-Throughput антифрод-платформа 20 000 tx/sec',
    estimatedMinutes: 50,
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Data System Design: Проектирование высоконагруженных дата-систем

Собеседование по **Data System Design** — главный рубеж для Senior и Lead Data Engineers в FAANG, банках и BigTech (Яндекс, Т-Банк, Авито, Ozon). В отличие от классического System Design бэкенда, где упор делается на API и микросервисы, в Data System Design фокус направлен на:
1. **Пропускную способность (Throughput):** десятки и сотни тысяч событий в секунду без потерь.
2. **Задержку (End-to-End Latency / SLA):** от миллисекунд в потоковом скоринге до минут в витринах.
3. **Объем и стоимость хранения (TCO):** разделение на Hot/Warm/Cold слои (Lakehouse S3 + Parquet vs ClickHouse SSD).
4. **Гарантии доставки:** At-Least-Once vs Exactly-Once (двухфазный коммит 2PC в Flink/Kafka).

#### Формулировка задачи
> **Бизнес-кейс:** Платежная система обрабатывает пиковую нагрузку **20 000 транзакций/сек** в основной базе PostgreSQL.
> - **Требование 1 (Real-time антифрод):** выявление подозрительных переводов с задержкой не более **3 секунд**.
> - **Требование 2 (Lakehouse):** сохранение неизменяемой истории всех операций за 5 лет (~500 ТБ) для регулятора (ЦБ).
> - **Требование 3 (Отсутствие влияния на OLTP):** аналитические выборки не должны нагружать транзакционную базу.

#### Архитектурный разбор решения
- **OLTP -> CDC:** Нельзя опрашивать базу через polling (\`SELECT ... WHERE updated_at > ...\`). Используется чтение Write-Ahead Log (\`WAL\`) через **Debezium CDC**, создающее нулевую нагрузку на CPU базы.
- **Шина данных (Kafka):** при 20 000 tx/sec и лимите ~4 500 msg/sec на одну партицию требуется минимум **6–8 партиций** в топике. Ключ партиционирования — \`user_id\` (чтобы все операции одного пользователя попадали строго в одну партицию для корректного скоринга).
- **Потоковый процессинг (Apache Flink):** расчет скользящих окон (например, «более 3 переводов разным людям за 60 секунд») с состоянием RocksDB и семантикой Exactly-Once.
- **Аналитическая витрина (ClickHouse):** для отчетов антифрод-мониторинга с агрегацией по движку \`ReplacingMergeTree\`. Обязательна микро-батчевая вставка (пачками от 5 000 до 10 000 строк).
- **Холодный слой (Apache Iceberg на S3):** колоночные файлы Parquet с сжатием ZSTD для дешевого хранения 500 ТБ.`,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Водопровод мегаполиса',
        content:
          'Транзакции клиентов — это поток воды. Если пустить поток через тонкую трубу с 1 вентилем (Kafka с 1 партицией), трубу разорвет (Consumer Lag). Чтобы доставить воду на фабрику (Lakehouse) и в пожарную службу (антифрод), строят параллельные магистрали с накопительными резервуарами (буферами).',
      },
      {
        type: 'data-flow',
        data: {
          nodes: [
            { id: '1', label: 'PostgreSQL WAL', sublabel: 'OLTP Primary 20k ops', type: 'source', status: 'success' },
            { id: '2', label: 'Debezium CDC', sublabel: 'Low-latency event capture', type: 'transform', status: 'success' },
            { id: '3', label: 'Kafka Cluster', sublabel: '8 partitions, tx.events', type: 'queue', status: 'running' },
            { id: '4', label: 'Apache Flink', sublabel: 'Real-time CEP scoring (<3s)', type: 'transform', status: 'running' },
            { id: '5', label: 'ClickHouse Mart', sublabel: 'Batch insert 10k rows', type: 'storage', status: 'success' },
            { id: '6', label: 'S3 + Iceberg', sublabel: 'Cold 500 TB Parquet', type: 'storage', status: 'idle' },
          ],
          edges: [
            { from: '1', to: '2', label: 'WAL replication' },
            { from: '2', to: '3', label: 'produce' },
            { from: '3', to: '4', label: 'stream consume' },
            { from: '3', to: '6', label: 'batch dump' },
            { from: '4', to: '5', label: 'scored alerts' },
          ],
        },
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Одиночные вставки в ClickHouse (Too Many Parts)',
        content:
          'ClickHouse создает новую директорию (part) на каждый запрос INSERT. Если писать в ClickHouse по 1 строке при 20 000 tx/sec, через 2 минуты на диске будет 2 400 000 кусков, демон упрется в лимит фонового мержа и выдаст фатальную ошибку «Too many parts in all data in table». Всегда буферизуйте вставки в пачки от 5 000 строк!',
      },
    ],
    glossaryTerms: [
      { term: 'CDC (Change Data Capture)', definition: 'Технология перехвата изменений данных на уровне бинарного журнала транзакций (WAL) без дополнительной нагрузки на СУБД.' },
      { term: 'Consumer Lag', definition: 'Количество непрочитанных сообщений в партициях Kafka, показывающее отставание консьюмера от продюсера.' },
      { term: 'Exactly-Once Semantics', definition: 'Гарантия того, что каждое событие повлияет на итоговое состояние системы ровно один раз даже при сетевых сбоях и падениях серверов.' },
    ],
    schemaPreview: [
      {
        tableName: 'anti_fraud_alerts',
        columns: [
          { name: 'alert_id', type: 'UUID', keyType: 'PK' },
          { name: 'user_id', type: 'BIGINT' },
          { name: 'risk_score', type: 'FLOAT' },
          { name: 'reason', type: 'VARCHAR(255)' },
          { name: 'created_at', type: 'TIMESTAMP' },
        ],
        sampleRows: [
          { alert_id: 'a101-b202', user_id: 849102, risk_score: 0.94, reason: 'Velocity check: 5 transfers / 30s', created_at: '2026-11-01 02:45:10' },
        ],
      },
    ],
    taskDescription:
      'В тренажере SystemDesignEngine спроектируйте архитектуру для потока 20 000 tx/sec: добавьте компоненты `PostgreSQL`, `Debezium CDC`, `Kafka Topic`, `Flink Streaming` и `ClickHouse`. В параметрах блока Kafka увеличьте количество партиций до 8, а в ClickHouse установите размер микро-батча не менее 5 000 строк. Запустите нагрузочный тест и добейтесь выполнения SLA.',
    seedCode: '',
    initialCode: '-- Соберите архитектуру на интерактивном холсте и запустите стресс-тест нагрузки',
    solutionCode: 'Kafka partitions: 8, ClickHouse batchSize: 5000',
    testConfig: {
      checkOrder: false,
      floatPrecision: 2,
      requiredAstPatterns: ['Kafka', 'ClickHouse'],
    },
    brokenProdTask: {
      title: 'Авария: Растущий лаг в Kafka из-за 1 партиции',
      incidentDescription:
        'P1 Incident: Консьюмер антифрода отстает на 500 000 сообщений, задержка скоринга выросла до 45 минут вместо 3 секунд. Найдено бутылочное горлышко: 1 партиция в топике.',
      buggyCode: 'kafka-topics.sh --alter --topic orders --partitions 1',
      fixHint: 'Увеличьте количество партиций до 8 или 16, чтобы распараллелить чтение между консьюмерами.',
      solutionCode: 'kafka-topics.sh --alter --topic orders --partitions 8',
      testConfig: { checkOrder: false, floatPrecision: 2 },
    },
    hints: [
      'Выберите блок Kafka Topic на холсте и увеличьте число партиций до 8.',
      'Выберите ClickHouse и убедитесь, что размер микро-батча установлен в 5 000 или 10 000 строк.',
      'Нажмите кнопку «Запустить нагрузочный тест» в правом верхнем углу.',
    ],
  },
];
