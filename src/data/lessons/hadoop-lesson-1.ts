import { Lesson } from '@/types/course';

export const hadoopLesson1: Lesson = {
  "id": "hadoop-1",
  "moduleSlug": "hadoop",
  "order": 1,
  "title": "Экосистема Hadoop и концепция Big Data: Data Locality и распределенные вычисления",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "Data Locality (Локальность данных)",
      "definition": "Фундаментальный принцип Big Data: вычисления (CPU/RAM) переносятся на тот физический сервер, где уже лежат необходимые блоки данных на диске, исключая перегрузку сети."
    },
    {
      "term": "Commodity Hardware",
      "definition": "Стандартные недорогие серверы массового производства, объединенные в кластер, где аппаратные сбои дисков и памяти компенсируются программной отказоустойчивостью."
    },
    {
      "term": "Scale-Out vs Scale-Up",
      "definition": "Scale-Up (вертикальное) — покупка более мощного сервера; Scale-Out (горизонтальное) — добавление сотен дешевых серверов в кластер с линейным ростом емкости."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "cluster_nodes_topology",
      "description": "Снимок топологии узлов распределенного кластера Hadoop",
      "columns": [
        {
          "name": "node_id",
          "type": "VARCHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "rack_id",
          "type": "VARCHAR(16)"
        },
        {
          "name": "disk_capacity_tb",
          "type": "INTEGER"
        },
        {
          "name": "locality_level",
          "type": "VARCHAR(32)"
        }
      ],
      "sampleRows": [
        {
          "node_id": "datanode-01.corp",
          "rack_id": "/rack-1",
          "disk_capacity_tb": 48,
          "locality_level": "NODE_LOCAL"
        },
        {
          "node_id": "datanode-02.corp",
          "rack_id": "/rack-1",
          "disk_capacity_tb": 48,
          "locality_level": "RACK_LOCAL"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Экосистема Apache Hadoop: Революция горизонтального масштабирования\n\nВ начале 2000-х годов корпорации уперлись в потолок вертикального масштабирования (Scale-Up). Если объем логов достигал 100 ТБ, один сервер Oracle или IBM не справлялся с обработкой, а его апгрейд стоил миллионы долларов.\n\nВ 2006 году Дуг Каттинг и Майк Кафарелла на основе статей Google (GFS и MapReduce) создали **Apache Hadoop**.\n\n#### Ключевая концепция: Перенос вычислений к данным (Data Locality)\nВ классических архитектурах данные лежат на сетевом диске (SAN/NAS), а сервер вычислений скачивает их по сетевому кабелю. При петабайтных объемах сеть мгновенно «захлебывается».\n\n**Hadoop перевернул парадигму:**\n* Данные нарезаются на куски и раскладываются по локальным дискам 1000 серверов (DataNodes).\n* Код задачи (JAR-файл Spark или Python-скрипт весом 10 МБ) отправляется по сети прямо на тот сервер, где лежит нужный блок данных!\n* 3 уровня локальности данных:\n  1. **NODE_LOCAL (идеал):** вычисления идут на том же сервере, данные читаются с локального диска через память.\n  2. **RACK_LOCAL:** данные читаются через локальный свитч стойки.\n  3. **OFF_RACK:** чтение через центральный маршрутизатор дата-центра (самый медленный fallback)."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Повар на кухне против доставки продуктов",
      "content": "Представьте банкет на 10 000 гостей: возить 5 тонн картошки в ресторан через пробки по городу (перенос данных к вычислениям) — безумие. Разумнее отправить 50 поваров прямо на овощебазу со своими ножами (перенос вычислений к данным), чтобы они начистили картошку на месте."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение традиционной архитектуры и Hadoop Data Locality",
        "beforeDescription": "Централизованное хранилище (SAN/NAS + Compute)",
        "beforeColumns": [
          "workload_scale",
          "network_bottleneck",
          "hardware_cost"
        ],
        "beforeRows": [
          [
            "500 TB dataset",
            "Network switches saturated 100%",
            "Millions for proprietary SAN storage"
          ],
          [
            "Compute node fails",
            "Single point of compute failure",
            "Expensive hardware support contracts"
          ],
          [
            "Scaling limitation",
            "Hard ceiling on bus bandwidth",
            "Cannot scale beyond 1 large box"
          ]
        ],
        "afterDescription": "Распределенная парадигма Hadoop (Data Locality)",
        "afterColumns": [
          "workload_scale",
          "network_bottleneck",
          "hardware_cost"
        ],
        "afterRows": [
          [
            "500 TB dataset",
            "NODE_LOCAL bus speed reads",
            "Cheap commodity hardware disks"
          ],
          [
            "DataNode server fails",
            "Self-healing auto-replication",
            "Zero downtime, automated failover"
          ],
          [
            "Scaling limitation",
            "Linear scale to 10,000 nodes",
            "Add 50 servers anytime"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Несоответствие сети и потеря Data Locality (OFF_RACK fallback)",
      "content": "Если кластер перегружен и все слоты CPU на узле с нужным блоком заняты, планировщик YARN отправляет задачу на случайный узел в другой стойке. При массовом переходе в `OFF_RACK` магистральные свитчи дата-центра перегреваются, и скорость всего кластера падает в 10 раз. Всегда отслеживайте метрику `DataLocality` в отчетах Spark/YARN!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Что такое Commodity Hardware в контексте Hadoop?",
      "content": "**Ответ:** Commodity Hardware — это стандартные серверы промышленного уровня (обычные двухпроцессорные серверы со стандартными SATA/NVMe дисками без дорогостоящих RAID-контроллеров и резервных блоков питания). Отказоустойчивость достигается не за счет дорогого «железа», а программно на уровне HDFS (3-кратная репликация блоков)."
    }
  ],
  "taskDescription": "Вам необходимо проверить топологию кластера HDFS и статус локальности данных:\n1. Выполните проверку работоспособности распределенной файловой системы с выводом сводного отчета: 'hdfs fsck / -summary'.\n2. Просмотрите статус доступного дискового пространства всех узлов DataNode с помощью административной команды: 'hdfs dfsadmin -report'.\n3. Объедините команды через оператор '&&' для последовательного запуска полного аудита кластера.\n\nВведите команду аудита HDFS.",
  "seedCode": "#!/bin/bash\n# Проверьте статус HDFS и доступность DataNodes\n",
  "initialCode": "hdfs fsck ... && hdfs dfsadmin ...",
  "solutionCode": "hdfs fsck / -summary && hdfs dfsadmin -report",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "hdfs fsck / -summary",
      "hdfs dfsadmin -report"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #1101: Перегрузка сети ЦОД из-за падения Data Locality до нуля",
    "incidentDescription": "Из-за неправильной настройки топологии стоек Spark запускал все таски на узлах без блоков, парализовав магистральную сеть компании.",
    "buggyCode": "spark.conf.set('spark.locality.wait', '0s') # нулевое ожидание локальности",
    "fixHint": "Установите адекватное время ожидания освобождения локального слота (spark.locality.wait = 3s).",
    "solutionCode": "spark.conf.set('spark.locality.wait', '3s')",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Команда проверки здоровья файловой системы: `hdfs fsck / -summary`.",
    "Команда отчета по узлам DataNode: `hdfs dfsadmin -report`.",
    "Объедините их через `&&`: `hdfs fsck / -summary && hdfs dfsadmin -report`."
  ]
};
