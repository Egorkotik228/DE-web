import { Lesson } from '@/types/course';

export const hadoopLessons: Lesson[] = [
  {
    id: 'hadoop-hdfs-yarn',
    moduleSlug: 'hadoop',
    order: 1,
    title: 'Apache Hadoop: Распределенная файловая система HDFS, блоки 128 МБ и оркестратор YARN',
    estimatedMinutes: 35,
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Apache Hadoop: Фундамент распределенных вычислений Big Data

До появления Hadoop суперкомпьютеры масштабировались вертикально (покупка всё более дорогих серверов с десятками CPU). **Hadoop ввел парадигму масштабирования на дешевом commodity hardware** — тысячах серверов, объединенных в сеть, где отказ отдельного диска или узла является нормальной штатной ситуацией.

#### Архитектура распределенной файловой системы (HDFS)
1. **NameNode (Мастер-узел):**
   - Хранит все метаданные файловой системы в оперативной памяти (дерево папок, права, списки блоков).
   - Журналирует операции в \`EditLog\` и периодически сбрасывает снимок в \`FSImage\` с помощью \`Secondary NameNode\`.
2. **DataNodes (Рабочие узлы):**
   - Хранят физические куски файлов — **блоки размером по умолчанию 128 МБ** (в отличие от 4 КБ в обычных ОС).
   - Отправляют на NameNode периодические сигналы жизнедеятельности (\`Heartbeat\`) и отчеты о блоках (\`Block Report\`).
3. **Фактор репликации (Replication Factor = 3):**
   - Каждый блок копируется трижды:
     - 1-я реплика: на локальный DataNode.
     - 2-я реплика: на другой узел в той же стойке (Rack).
     - 3-я реплика: на узел в **другой физической стойке** (Rack Awareness) для защиты от обесточивания целой стойки!

#### Менеджер ресурсов YARN (Yet Another Resource Negotiator)
- **ResourceManager:** глобальный планировщик CPU и памяти кластера.
- **NodeManager:** агент на каждом сервере, отслеживающий контейнеры.
- **ApplicationMaster:** процесс, управляющий жизненным циклом конкретного приложения (Spark/MapReduce).`,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Разрезание гигантской книги',
        content:
          'Если вам нужно за 10 минут прочитать Большую советскую энциклопедию на 50 000 страниц, один человек не успеет. Hadoop HDFS разрезает книгу на главы по 128 страниц (блоки), раздает их 300 студентам (DataNodes) и заставляет читать параллельно (MapReduce).',
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Миллионы мелких файлов убивают NameNode',
        content:
          'Каждый файл и блок в HDFS занимает ровно 150 байт в оперативной памяти NameNode. Если положить в HDFS 100 миллионов файлов по 1 КБ, NameNode съест все 64 ГБ RAM и упадет с OOM, хотя дисковое пространство занято меньше чем на 1%!',
      },
    ],
    glossaryTerms: [
      { term: 'Block Size (128 MB)', definition: 'Минимальная неделимая единица хранения файла в HDFS, оптимизированная для последовательного чтения больших объемов.' },
      { term: 'Rack Awareness', definition: 'Алгоритм размещения реплик блоков с учетом физического расположения серверов в серверных стойках дата-центра.' },
      { term: 'fsck', definition: 'Утилита проверки целостности файловой системы (HDFS File System Consistency Check).' },
    ],
    schemaPreview: [
      {
        tableName: 'hdfs_cluster_status',
        columns: [
          { name: 'namenode_status', type: 'VARCHAR(20)' },
          { name: 'total_datanodes', type: 'INT' },
          { name: 'under_replicated_blocks', type: 'INT' },
        ],
        sampleRows: [
          { namenode_status: 'ACTIVE', total_datanodes: 24, under_replicated_blocks: 0 },
        ],
      },
    ],
    taskDescription:
      'В интерактивном терминале изучите файлы HDFS с помощью `hdfs dfs -ls /`, создайте новую директорию для сырых данных `hdfs dfs -mkdir -p /raw/orders/`, загрузите файл с помощью `hdfs dfs -put orders.csv /raw/orders/` и проверьте дисковое пространство с помощью `hdfs dfs -du -h /`. Нажмите «Проверить решение».',
    seedCode: '',
    initialCode: 'hdfs dfs -ls /',
    solutionCode: 'hdfs dfs -mkdir -p /raw/orders/ && hdfs dfs -put orders.csv /raw/orders/ && hdfs dfs -du -h /',
    testConfig: {
      checkOrder: false,
      floatPrecision: 2,
      requiredAstPatterns: ['hdfs dfs', '-ls', '-mkdir'],
    },
    brokenProdTask: {
      title: 'Авария: Сбой DataNode и поврежденные блоки',
      incidentDescription:
        'P1 Incident: Отказ сетевого свича привел к выпадению стойки. Запустите проверку целостности блоков через hdfs fsck.',
      buggyCode: 'hdfs dfsadmin -report',
      fixHint: 'Запустите утилиту hdfs fsck / -files -blocks -locations для диагностики недореплицированных блоков.',
      solutionCode: 'hdfs fsck / -files -blocks -locations',
      testConfig: { checkOrder: false, floatPrecision: 2 },
    },
    hints: [
      'Выполните команду «hdfs dfs -ls /».',
      'Создайте директорию «hdfs dfs -mkdir -p /raw/orders/».',
      'Загрузите файл «hdfs dfs -put orders.csv /raw/orders/».',
    ],
  },
];
