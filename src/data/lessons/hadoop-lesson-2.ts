import { Lesson } from '@/types/course';

export const hadoopLesson2: Lesson = {
  "id": "hadoop-2",
  "moduleSlug": "hadoop",
  "order": 2,
  "title": "Архитектура HDFS под капотом: NameNode (FSImage, EditLog) и физические блоки 128 МБ",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "NameNode",
      "definition": "Центральный управляющий мастер-узел HDFS, хранящий в оперативной памяти (RAM) всю структуру каталогов, права доступа и соответствие файлов спискам идентификаторов блоков."
    },
    {
      "term": "FSImage и EditLog",
      "definition": "FSImage — снимок файловой системы на диске; EditLog — журнал транзакций (write-ahead log), куда NameNode сбрасывает все операции записи перед ответом клиенту."
    },
    {
      "term": "Размер блока HDFS (128 МБ)",
      "definition": "Стандартный размер неделимого чанка данных в HDFS, выбранный для минимизации накладных расходов на позиционирование головок HDD (seek time)."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "hdfs_block_catalog",
      "description": "Связка логического файла и физических блоков в метаданных NameNode",
      "columns": [
        {
          "name": "block_id",
          "type": "VARCHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "file_path",
          "type": "VARCHAR(128)"
        },
        {
          "name": "block_size_mb",
          "type": "INTEGER"
        },
        {
          "name": "assigned_datanodes",
          "type": "VARCHAR(64)"
        }
      ],
      "sampleRows": [
        {
          "block_id": "blk_1073741825",
          "file_path": "/data/logs/access.log",
          "block_size_mb": 128,
          "assigned_datanodes": "dn1, dn2, dn7"
        },
        {
          "block_id": "blk_1073741826",
          "file_path": "/data/logs/access.log",
          "block_size_mb": 42,
          "assigned_datanodes": "dn3, dn4, dn8"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Внутреннее устройство HDFS: Как хранятся петабайты данных\n\nВ обычных файловых системах (ext4, NTFS) размер блока составляет **4 КБ**. Если бы HDFS использовала блоки по 4 КБ, то для хранения 1 ПБ потребовалось бы 250 миллиардов блоков, а мастер-сервер NameNode лопнул бы от нехватки оперативной памяти!\n\n#### 1. Почему блоки HDFS такие гигантские (128–256 МБ):\n* **Минимизация Seek Time:** Время перемещения считывающей головки жесткого диска (HDD Seek Time) занимает около 10 миллисекунд. Передача 128 МБ со скоростью 100 МБ/с занимает более 1 секунды. Время позиционирования составляет менее 1% от времени чтения данных!\n* **Каждый блок в NameNode весит ~150 байт RAM.** На 100 миллионов блоков NameNode требуется всего около 32 ГБ оперативной памяти.\n\n#### 2. Жизненный цикл метаданных: FSImage и EditLog\n1. При изменении файловой системы (`mkdir`, `touch`, `append`) NameNode сначала пишет операцию в **EditLog** на диске (синхронная запись с `fsync`).\n2. Затем обновляет структуру в **оперативной памяти (RAM)** для мгновенного чтения.\n3. **FSImage** — это замороженный снимок метаданных на определенный момент времени.\n4. **Secondary NameNode (Checkpoint Node):** периодически скачивает FSImage и накопившийся EditLog, объединяет их в новый FSImage и возвращает на NameNode, предотвращая бесконечное разрастание EditLog."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Библиотечная картотека и кассовая лента",
      "content": "FSImage — это напечатанный типографский каталог библиотеки на 1 января: в нем указаны все шкафы и полки. EditLog — это кассовый чек у библиотекаря за сегодняшний день, куда карандашом дописывают: «Книга №40 выдана читателю». Secondary NameNode приходит ночью, берет старый каталог и карандашные чеки и перепечатывает новый свежий каталог на завтра."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение файловых систем общего назначения и HDFS",
        "beforeDescription": "Стандартная ФС (Linux ext4, блоки 4 КБ)",
        "beforeColumns": [
          "storage_feature",
          "ext4_limits",
          "big_data_consequence"
        ],
        "beforeRows": [
          [
            "Block Size",
            "4 KB default cluster",
            "Billions of seek operations"
          ],
          [
            "Metadata storage",
            "Scattered inodes on disk",
            "High random I/O latency"
          ],
          [
            "Target workload",
            "Millions of small 10KB files",
            "Poor streaming throughput"
          ]
        ],
        "afterDescription": "Hadoop HDFS (Блоки 128 МБ)",
        "afterColumns": [
          "storage_feature",
          "ext4_limits",
          "big_data_consequence"
        ],
        "afterRows": [
          [
            "Block Size",
            "128 MB or 256 MB",
            "Sequential streaming wire speed"
          ],
          [
            "Metadata storage",
            "100% in-memory NameNode RAM",
            "Sub-millisecond file lookup"
          ],
          [
            "Target workload",
            "Gigabyte/Terabyte large files",
            "Maximum sequential disk read"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Проблема мелких файлов (Small Files Problem) в HDFS",
      "content": "Пайплайн записал 50 000 000 файлов по 5 КБ. Каждый файл и его блок заняли по 150 байт в RAM NameNode. Память NameNode (64 ГБ) исчерпалась полностью, сборщик мусора Java ушел в 15-минутную паузу (Full GC Pause), и весь кластер Hadoop перестал отвечать. Никогда не храните в HDFS сырые мелкие файлы — объединяйте их в архивы SequenceFile, Har или крупные Parquet-блоки!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Зачем нужен Secondary NameNode и является ли он горячим резервом (Standby)?",
      "content": "**Ответ:** НЕТ, Secondary NameNode **НЕ ЯВЛЯЕТСЯ** горячим резервом! Если NameNode упадет, Secondary NameNode не сможет автоматически продолжить обслуживание клиентов. Его единственная задача — выполнять слияние (Checkpointing) старого `FSImage` и накопившегося `EditLog`, снимая вычислительную нагрузку с активного NameNode."
    }
  ],
  "taskDescription": "Вам необходимо создать директорию в HDFS и загрузить в нее файл с явным указанием размера блока 128 МБ:\n1. Создайте директорию '/data/raw_orders' с помощью 'hdfs dfs -mkdir -p /data/raw_orders'.\n2. Загрузите локальный файл 'orders.csv' в HDFS с принудительным размером блока 128 МБ (134217728 байт):\n   'hdfs dfs -Ddfs.blocksize=134217728 -put orders.csv /data/raw_orders/'.\n3. Объедините команды через оператор '&&'.\n\nВведите команду создания каталога и загрузки файла с блоком 128 МБ.",
  "seedCode": "#!/bin/bash\n# Загрузите файл в HDFS с размером блока 128 МБ\n",
  "initialCode": "hdfs dfs -mkdir -p ... && hdfs dfs -Ddfs.blocksize=... -put orders.csv ...",
  "solutionCode": "hdfs dfs -mkdir -p /data/raw_orders && hdfs dfs -Ddfs.blocksize=134217728 -put orders.csv /data/raw_orders/",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "hdfs dfs -mkdir -p /data/raw_orders",
      "dfs.blocksize=134217728",
      "-put orders.csv /data/raw_orders/"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #1102: Падение NameNode из-за Out-Of-Memory при миллионах мелких файлов",
    "incidentDescription": "ETL-скрипт нагенерировал 20 млн файлов по 2 КБ в HDFS, забив всю память JVM NameNode.",
    "buggyCode": "# Запись каждой строки в отдельный файл HDFS\nfor row in stream:\n    hdfs.write(f'/data/{uuid.uuid4()}.json', row)",
    "fixHint": "Буферизуйте записи пачками по 128 МБ перед отправкой в HDFS или используйте Apache Avro/Parquet.",
    "solutionCode": "with open_batch_writer(block_size='128M') as writer:\n    for row in stream:\n        writer.append(row)",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Создание директории: `hdfs dfs -mkdir -p /data/raw_orders`.",
    "Параметр размера блока задается через опцию `-Ddfs.blocksize=134217728`.",
    "Загрузка файла выполняется командой `-put orders.csv /data/raw_orders/`."
  ]
};
