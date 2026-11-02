import { Lesson } from '@/types/course';

export const hadoopLesson3: Lesson = {
  "id": "hadoop-3",
  "moduleSlug": "hadoop",
  "order": 3,
  "title": "Отказоустойчивость и репликация в HDFS: Rack Awareness (3x) и Erasure Coding (Reed-Solomon)",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Rack Awareness (Осведомленность о стойках)",
      "definition": "Алгоритм HDFS, учитывающий сетевую топологию дата-центра для умного размещения реплик блоков данных в разных стойках."
    },
    {
      "term": "Фактор репликации 3x (Replication Factor = 3)",
      "definition": "Классическое правило HDFS: каждый блок дублируется 3 раза (2 копии в одной стойке на разных серверах, 1 копия в другой физической стойке)."
    },
    {
      "term": "Erasure Coding (HDFS EC)",
      "definition": "Современная математическая схема отказоустойчивости (коды Рида-Соломона RS(6,3)), экономящая до 50% дискового пространства по сравнению с 3x репликацией."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "hdfs_replication_topology",
      "description": "Схема размещения реплик блока по стойкам кластера",
      "columns": [
        {
          "name": "replica_id",
          "type": "INTEGER",
          "keyType": "PK"
        },
        {
          "name": "block_id",
          "type": "VARCHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "node_host",
          "type": "VARCHAR(32)"
        },
        {
          "name": "rack_location",
          "type": "VARCHAR(32)"
        }
      ],
      "sampleRows": [
        {
          "replica_id": 1,
          "block_id": "blk_9981",
          "node_host": "dn-01.corp",
          "rack_location": "/dc1/rack-1"
        },
        {
          "replica_id": 2,
          "block_id": "blk_9981",
          "node_host": "dn-05.corp",
          "rack_location": "/dc1/rack-2"
        },
        {
          "replica_id": 3,
          "block_id": "blk_9981",
          "node_host": "dn-06.corp",
          "rack_location": "/dc1/rack-2"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Отказоустойчивость HDFS: Как не потерять данные при отключении целой стойки\n\nСерверные стойки в дата-центре имеют общие точки отказа: блок распределения питания (PDU) и магистральный коммутатор (Top-of-Rack Switch, ToR). Если свитч стойки сгорит, все 40 серверов в стойке одновременно станут недоступны!\n\n#### 1. Классическая политика Rack Awareness (3 реплики):\nКогда клиент записывает блок данных:\n* **1-я реплика:** размещается на локальном узле клиента (или на случайном сервере в стойке).\n* **2-я реплика:** размещается на узле в **ДРУГОЙ физической стойке** (защита от падения стойки №1).\n* **3-я реплика:** размещается на ДРУГОМ сервере в той же **второй стойке** (для минимизации межстоечного трафика при чтении).\n* Любые последующие реплики (4, 5...) распределяются по случайным стойкам.\n\n#### 2. Проблема оверхеда 3x и спасительный Erasure Coding (Hadoop 3.0+):\nПри факторе репликации 3x для хранения 10 ПБ полезных данных требуется купить **30 ПБ физических дисков** (накладные расходы 200%)!\n\nВ Hadoop 3.0 появился **Erasure Coding (EC)** на кодах Рида-Соломона (например, `RS(6,3)`):\n* Данные делятся на 6 блоков данных и генерируют 3 блока четности (Parity Blocks).\n* Система выдерживает одновременную потерю **любых 3 узлов**!\n* Накладные расходы на хранение составляют всего **50% (коэффициент 1.5x вместо 3.0x)**, экономя компании миллионы долларов на закупке дисков."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Резервная копия на даче у бабушки",
      "content": "Хранить все 3 копии важного документа в одном ящике стола — глупо: при пожаре сгорят все три. Положить одну копию в сейф дома, а вторую отвезти на дачу в другой конец города — это Rack Awareness: пожар в одной квартире не уничтожит ваши архивы."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение 3x репликации и Erasure Coding в HDFS",
        "beforeDescription": "Классическая трехкратная репликация (3x)",
        "beforeColumns": [
          "durability_metric",
          "storage_overhead",
          "network_rebuild_cost"
        ],
        "beforeRows": [
          [
            "Tolerates 2 node failures",
            "200% storage overhead (3x cost)",
            "Simple block stream copy"
          ],
          [
            "Compute overhead",
            "Zero CPU overhead (direct write)",
            "Optimal for hot append data"
          ],
          [
            "Disk space ratio",
            "10 PB data requires 30 PB disk",
            "Massive hardware expenditure"
          ]
        ],
        "afterDescription": "Hadoop 3.0 Erasure Coding RS(6,3)",
        "afterColumns": [
          "durability_metric",
          "storage_overhead",
          "network_rebuild_cost"
        ],
        "afterRows": [
          [
            "Tolerates 3 node failures",
            "50% storage overhead (1.5x cost)",
            "Calculates parity matrix"
          ],
          [
            "Compute overhead",
            "Lightweight Intel ISA-L CPU ops",
            "Best for warm/cold archive data"
          ],
          [
            "Disk space ratio",
            "10 PB data requires 15 PB disk",
            "Saves 50% of entire datacenter budget"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Ненастроенный скрипт топологии (Default Rack Warning)",
      "content": "Если в конфигурации `core-site.xml` не настроен параметр `net.topology.script.file.name`, NameNode считает, что все 1000 серверов находятся в одной дефолтной стойке (`/default-rack`). В результате 3 реплики одного блока могут случайно оказаться на серверах в одной стойке, и при выбивании фазы питания стойки данные будут безвозвратно утеряны!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Почему Erasure Coding не используют для часто обновляемых или горячих данных (Hot Data)?",
      "content": "**Ответ:** Erasure Coding требует разбиения блоков на мелкие ячейки (striping) и постоянного пересчета контрольных сумм по матрице Вандермонда при любых изменениях. Для горячих данных это создает ощутимую задержку (latency) и нагрузку на CPU. Поэтому EC применяют для холодных и теплых архивов (Cold/Warm Data), а горячие витрины хранят в стандартной 3x репликации."
    }
  ],
  "taskDescription": "Вам необходимо изменить фактор репликации для критической папки в HDFS:\n1. Установите фактор репликации 3 для директории '/data/prod/core_marts' с помощью команды 'hdfs dfs -setrep -w 3 /data/prod/core_marts'.\n2. Флаг '-w' указывает команде ожидать, пока репликация физически завершится на всех DataNode.\n\nВведите команду установки фактора репликации с ожиданием завершения.",
  "seedCode": "#!/bin/bash\n# Установите фактор репликации 3 для критических данных\n",
  "initialCode": "hdfs dfs -setrep ... 3 /data/prod/core_marts",
  "solutionCode": "hdfs dfs -setrep -w 3 /data/prod/core_marts",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "hdfs dfs",
      "-setrep",
      "-w",
      "3",
      "/data/prod/core_marts"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #1103: Потеря блоков данных из-за фактора репликации 1",
    "incidentDescription": "Инженер в целях экономии выставил фактор репликации 1 на прод-таблицу. При сбое одного жесткого диска 15 блоков пропали навсегда (CORRUPT BLOCKS).",
    "buggyCode": "hdfs dfs -setrep -R 1 /data/prod/warehouse",
    "fixHint": "Минимальный безопасный фактор репликации для продакшна равен 3.",
    "solutionCode": "hdfs dfs -setrep -w -R 3 /data/prod/warehouse",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Используйте команду `hdfs dfs -setrep`.",
    "Флаг ожидания завершения синхронизации реплик: `-w`.",
    "Полная команда: `hdfs dfs -setrep -w 3 /data/prod/core_marts`."
  ]
};
