import { Lesson } from '@/types/course';

export const hadoopLesson5: Lesson = {
  "id": "hadoop-5",
  "moduleSlug": "hadoop",
  "order": 5,
  "title": "Менеджер ресурсов YARN: Архитектура ResourceManager, NodeManagers и контейнеры",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Apache YARN (Yet Another Resource Negotiator)",
      "definition": "Слой управления вычислительными ресурсами кластера Hadoop, абстрагирующий память (RAM) и ядра процессора (vCores) для параллельного выполнения фреймворков (Spark, MapReduce, Flink)."
    },
    {
      "term": "ResourceManager (RM)",
      "definition": "Центральный арбитр и мастер-демон YARN, распределяющий доступные ресурсы кластера между конкурирующими приложениями."
    },
    {
      "term": "ApplicationMaster (AM)",
      "definition": "Специальный процесс, запускаемый под каждое конкретное приложение (например, Spark Driver), запрашивающий у ResourceManager контейнеры и координирующий их выполнение."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "yarn_cluster_capacity",
      "description": "Снимок утилизации ресурсов кластера в ResourceManager",
      "columns": [
        {
          "name": "queue_name",
          "type": "VARCHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "allocated_memory_gb",
          "type": "INTEGER"
        },
        {
          "name": "allocated_vcores",
          "type": "INTEGER"
        },
        {
          "name": "active_apps",
          "type": "INTEGER"
        }
      ],
      "sampleRows": [
        {
          "queue_name": "prod_critical",
          "allocated_memory_gb": 512,
          "allocated_vcores": 64,
          "active_apps": 4
        },
        {
          "queue_name": "ad_hoc_analytics",
          "allocated_memory_gb": 128,
          "allocated_vcores": 16,
          "active_apps": 2
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Архитектура YARN: Как устроен диспетчер ресурсов Big Data\n\nВ Hadoop 1.0 вычислительный движок был намертво привязан к парадигме MapReduce (демоны `JobTracker` и `TaskTracker`). Никакие другие движки запустить было невозможно.\n\nВ Hadoop 2.0 появилась система **YARN**, которая отделила управление ресурсами от самих вычислений, превратив Hadoop в универсальную платформу для Spark, Flink, Trino и Tez.\n\n#### Ключевые компоненты YARN:\n1. **ResourceManager (Мастер кластера):**\n   - Содержит `Scheduler`, который распределяет память и vCores по правилам очередей.\n   - Содержит `ApplicationsManager`, принимающий отправку приложений (jobs).\n2. **NodeManager (Агент на каждом сервере):**\n   - Контролирует фактическое потребление ресурсов локальными контейнерами (CPU, RAM).\n   - Если контейнер превышает выделенный лимит физической памяти (`yarn.nodemanager.pmem-check-enabled`), NodeManager принудительно убивает его с кодом 143/137.\n3. **ApplicationMaster (Координатор конкретного приложения):**\n   - При запуске `spark-submit --master yarn` сначала запускается контейнер ApplicationMaster.\n   - AM ведет переговоры с ResourceManager: «Мне нужно 20 контейнеров по 4 ГБ RAM и 2 vCore в той же стойке, где лежат данные!». При получении гранта связывается с NodeManagers и запускает исполнители (Spark Executors)."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Биржа аренды строительной техники",
      "content": "ResourceManager — это диспетчер на базе проката спецтехники: он знает, сколько экскаваторов (ядер) и самосвалов (гигабайт RAM) свободно на каждой стройплощадке. ApplicationMaster — это прораб конкретного объекта: он приходит на биржу, арендует 10 самосвалов, раздает задания водителям (NodeManager), а по окончании стройки сдает технику обратно."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение Hadoop 1.0 (JobTracker) и Hadoop 2+ (YARN)",
        "beforeDescription": "Hadoop 1.0 (Монолитный JobTracker)",
        "beforeColumns": [
          "cluster_capability",
          "scalability_limit",
          "supported_engines"
        ],
        "beforeRows": [
          [
            "Fixed Map/Reduce slots",
            "Bottleneck at 4,000 nodes",
            "Strictly MapReduce only"
          ],
          [
            "Static slot allocation",
            "Wasted Reduce slots if idle",
            "Cannot run in-memory Spark"
          ],
          [
            "JobTracker single point of failure",
            "Uncontrolled memory leaks",
            "No multi-tenancy support"
          ]
        ],
        "afterDescription": "Hadoop YARN (Dynamic Containers)",
        "afterColumns": [
          "cluster_capability",
          "scalability_limit",
          "supported_engines"
        ],
        "afterRows": [
          [
            "Dynamic RAM / vCore allocation",
            "Scales to 10,000+ nodes",
            "Runs Spark, Flink, LLMs, Tez"
          ],
          [
            "Elastic container sharing",
            "Zero idle capacity waste",
            "Native fast in-memory execution"
          ],
          [
            "ResourceManager HA (Active/Standby)",
            "Fine-grained cgroups isolation",
            "Multi-tenant queue governance"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Превышение лимита виртуальной памяти (vmem limit killed)",
      "content": "NodeManager убивает Spark Executor с ошибкой: `Container killed by YARN for exceeding virtual memory limits. 2.1 GB of 2.0 GB used`. Часто JVM в Linux резервирует огромный пул виртуальной памяти, не используя физическую. Решение в проде: отключить строгую проверку виртуальной памяти в `yarn-site.xml` (`yarn.nodemanager.vmem-check-enabled=false`), сохранив жесткий контроль физической RAM."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: В чем разница между режимами `yarn-client` и `yarn-cluster` при запуске Spark?",
      "content": "**Ответ:** В режиме `yarn-client` драйвер Spark (Spark Driver) работает локально на машине инженера/сервере шлюза, а в YARN запускаются только воркеры (Executors). Если закрыть ноутбук — джоб упадет. В режиме `yarn-cluster` сам Spark Driver упаковывается в контейнер ApplicationMaster внутри кластера YARN, становясь полностью независимым от клиентской машины."
    }
  ],
  "taskDescription": "Вам необходимо исследовать статус запущенных приложений в менеджере YARN и убить зависший джоб:\n1. Получите список активных приложений со статусом RUNNING командой: 'yarn application -list -appStates RUNNING'.\n2. Принудительно завершите зависшее приложение с идентификатором 'application_1700000000000_0042' командой: 'yarn application -kill application_1700000000000_0042'.\n\nВведите команду вывода списка активных приложений и последующего завершения зависшего джоба через '&&'.",
  "seedCode": "#!/bin/bash\n# Просмотрите список и завершите зависшее YARN приложение\n",
  "initialCode": "yarn application -list ... && yarn application -kill application_1700000000000_0042",
  "solutionCode": "yarn application -list -appStates RUNNING && yarn application -kill application_1700000000000_0042",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "yarn application -list -appStates RUNNING",
      "yarn application -kill application_1700000000000_0042"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #1105: Зависание кластера из-за падения Spark в режиме yarn-client при разрыве SSH",
    "incidentDescription": "Инженер запустил тяжелый 6-часовой расчет в режиме client со шлюзового сервера. При обрыве связи драйвер упал, а 50 экзекуторов остались висеть в YARN зомби-процессами.",
    "buggyCode": "spark-submit --master yarn --deploy-mode client heavy_etl.py",
    "fixHint": "Переключите режим развертывания на cluster для надежной автономной работы внутри YARN.",
    "solutionCode": "spark-submit --master yarn --deploy-mode cluster heavy_etl.py",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Команда фильтрации активных приложений: `yarn application -list -appStates RUNNING`.",
    "Команда принудительного завершения: `yarn application -kill <app_id>`.",
    "Объедините команды оператором `&&`."
  ]
};
