import { Lesson } from '@/types/course';

export const kafkaLessons: Lesson[] = [
  {
    id: 'kafka-partitions-consumer-lag',
    moduleSlug: 'kafka',
    order: 1,
    title: 'Apache Kafka: Архитектура брокеров, партиции, Consumer Groups и мониторинг Lag',
    estimatedMinutes: 40,
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Apache Kafka: Распределенный журнал коммитов (Distributed Commit Log)

Kafka — это не традиционная очередь сообщений вроде RabbitMQ. В RabbitMQ сообщение удаляется сразу после подтверждения (\`ACK\`). **Kafka — это персистентный неизменяемый распределенный журнал (Append-Only Log)**, в котором сообщения хранятся на диске дни или месяцы независимо от того, прочитали их или нет!

#### Архитектура топика и партиций
- **Topic (Топик):** логическая категория потока сообщений (например, \`orders.events\`).
- **Partition (Партиция):** единица масштабирования и параллелизма в Kafka. Внутри партиции сообщения строго упорядочены по смещению (**Offset**).
- **Партиционирование по ключу:** если продюсер передает ключ сообщения (\`key = customer_id\`), Kafka вычисляет хэш (\`murmur2(key) % partitions_count\`). Все сообщения одного клиента гарантированно попадают в одну партицию с сохранением хронологического порядка!
- **Сегменты лога (\`.log\` и \`.index\`):** партиция разбита на файлы сегментов по 1 ГБ. Чтение происходит через OS Page Cache с нулевым копированием байт по технологии **Zero-Copy (\`sendfile\`)**.

#### Consumer Groups и балансировка нагрузки
- **Consumer Group (Группа потребителей):** пул параллельных процессов консьюмеров с общим \`group.id\`.
- **Золотое правило масштабирования Kafka:** в рамках одной группы потребителей **одна партиция топика может читаться только одним консьюмером одновременно!**
  - Если у вас 3 партиции и 3 консьюмера — нагрузка делится по 1 партиции на процесс.
  - Если добавить 4-го консьюмера, он будет простаивать (Idle).
  - Хотите увеличить пропускную способность консьюмеров? Увеличьте число партиций топика!

#### Что такое Consumer Lag и почему это главная метрика дата-инженера?
\`\`\`
LAG = LOG-END-OFFSET (последнее записанное продюсером) - CURRENT-OFFSET (последнее прочитанное группой)
\`\`\`
Если продюсер пишет 10 000 сообщений/сек, а консьюмер успевает обрабатывать только 6 000 сообщений/сек, **Consumer Lag** начинает линейно расти. Растущий лаг означает задержку обновления аналитических витрин и деградацию SLA.`,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Очередь на кассах супермаркета',
        content:
          'Партиции топика — это кассовые аппараты. Консьюмеры — это кассиры. Если у вас в магазине всего 2 кассы (2 партиции), вы не можете нанять 5 кассиров для ускорения обслуживания — троим просто негде будет сесть. Нужно открывать новые кассы (партиции).',
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Несоответствие Rebalance Protocol и max.poll.interval.ms',
        content:
          'Если консьюмер вычитал пачку из 500 сообщений и обрабатывает её дольше значения \`max.poll.interval.ms\` (по умолчанию 5 минут), брокер решает, что консьюмер завис, исключает его из группы и запускает дорогой **Stop-the-World Rebalance**, блокируя чтение всего топика.',
      },
    ],
    glossaryTerms: [
      { term: 'Offset', definition: 'Уникальный монотонно возрастающий 64-битный целочисленный индекс сообщения внутри партиции топика Kafka.' },
      { term: 'Consumer Lag', definition: 'Разница между последним смещением, записанным в топик, и смещением, подтвержденным группой потребителей.' },
      { term: 'Zero-Copy', definition: 'Технология передачи данных из кэша страниц операционной системы напрямую в сетевой сокет минуя пространство пользователя (sendfile).' },
    ],
    schemaPreview: [
      {
        tableName: 'kafka_partition_offsets',
        columns: [
          { name: 'topic', type: 'VARCHAR(50)' },
          { name: 'partition', type: 'INT', keyType: 'PK' },
          { name: 'current_offset', type: 'BIGINT' },
          { name: 'log_end_offset', type: 'BIGINT' },
          { name: 'consumer_lag', type: 'BIGINT' },
        ],
        sampleRows: [
          { topic: 'postgres.public.orders', partition: 0, current_offset: 140291, log_end_offset: 140295, consumer_lag: 4 },
          { topic: 'postgres.public.orders', partition: 1, current_offset: 89102, log_end_offset: 145000, consumer_lag: 55898 },
        ],
      },
    ],
    taskDescription:
      'В интерактивном терминале исследуйте топики брокера с помощью `kafka-topics.sh --list`, изучите конфигурацию топика `postgres.public.orders` через `kafka-topics.sh --describe --topic postgres.public.orders` и проверьте лаг консьюмеров с помощью команды `kafka-consumer-groups.sh --describe --group analytics_service`. Нажмите «Проверить решение».',
    seedCode: '',
    initialCode: 'kafka-topics.sh --list',
    solutionCode: 'kafka-consumer-groups.sh --describe --group analytics_service',
    testConfig: {
      checkOrder: false,
      floatPrecision: 2,
      requiredAstPatterns: ['kafka-topics.sh', 'kafka-consumer-groups.sh'],
    },
    brokenProdTask: {
      title: 'Авария: Катастрофический Consumer Lag в 55 000 сообщений',
      incidentDescription:
        'P1 Incident: Консьюмер второй партиции завис из-за медленной базы данных. Выполните инспекцию лага через kafka-consumer-groups.sh.',
      buggyCode: 'kafka-consumer-groups.sh --list',
      fixHint: 'Запустите команду kafka-consumer-groups.sh --describe --group analytics_service для обнаружения проблемной партиции.',
      solutionCode: 'kafka-consumer-groups.sh --describe --group analytics_service',
      testConfig: { checkOrder: false, floatPrecision: 2 },
    },
    hints: [
      'Выполните «kafka-topics.sh --list», чтобы увидеть список топиков.',
      'Выполните «kafka-topics.sh --describe --topic postgres.public.orders».',
      'Запустите «kafka-consumer-groups.sh --describe --group analytics_service» для мониторинга лага.',
    ],
  },
];
