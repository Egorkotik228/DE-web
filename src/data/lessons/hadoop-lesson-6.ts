import { Lesson } from '@/types/course';

export const hadoopLesson6: Lesson = {
  "id": "hadoop-6",
  "moduleSlug": "hadoop",
  "order": 6,
  "title": "Планировщики YARN: Capacity vs Fair Scheduler, очереди, приоритеты и Preemption",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Capacity Scheduler",
      "definition": "Многопользовательский планировщик YARN по умолчанию, гарантирующий каждой очереди выделенный процент ресурсов кластера (guaranteed capacity) с возможностью заимствования свободных мощностей."
    },
    {
      "term": "Fair Scheduler",
      "definition": "Планировщик YARN, динамически выравнивающий ресурсы между активными приложениями так, чтобы каждый джоб получал равную долю мощностей."
    },
    {
      "term": "Preemption (Вытеснение ресурсов)",
      "definition": "Механизм принудительного отбора ресурсов у низкоприоритетных фоновых задач в пользу критических прод-задач, если очередь заполнилась чужими джобами."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "yarn_queue_allocations",
      "description": "Конфигурация очередей Capacity Scheduler в файле capacity-scheduler.xml",
      "columns": [
        {
          "name": "queue_path",
          "type": "VARCHAR(64)",
          "keyType": "PK"
        },
        {
          "name": "capacity_percent",
          "type": "INTEGER"
        },
        {
          "name": "max_capacity_percent",
          "type": "INTEGER"
        },
        {
          "name": "priority",
          "type": "INTEGER"
        }
      ],
      "sampleRows": [
        {
          "queue_path": "root.production",
          "capacity_percent": 70,
          "max_capacity_percent": 100,
          "priority": 10
        },
        {
          "queue_path": "root.dev_analytics",
          "capacity_percent": 30,
          "max_capacity_percent": 50,
          "priority": 1
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Многопользовательский кластер (Multi-Tenancy): Как поделить кластер между 100 аналитиками\n\nЕсли на кластере Hadoop запустить задачи без очередей, первый же аналитик, запустивший неоптимальный Spark-скрипт с `crossJoin()`, заберет себе **100% ресурсов кластера** (все 20 ТБ RAM и 2000 ядер). Утренние отчеты для топ-менеджмента встанут в бесконечную очередь.\n\nДля изоляции команд в YARN используются планировщики ресурсов:\n\n#### 1. Capacity Scheduler (Стандарт Enterprise Hadoop):\n* Ресурсы кластера делятся на иерархические очереди:\n  - `root.production` (гарантированные **70%** ресурсов).\n  - `root.analytics` (**20%** ресурсов).\n  - `root.dev` (**10%** ресурсов).\n* **Elastic Capacity (Эластичность):** Если очередь `production` ночью пустует, аналитики могут временно занять до 100% кластера (`maximum-capacity`).\n\n#### 2. Механизм Preemption (Вытеснение):\nЧто происходит, если аналитики заняли весь кластер ночью, а в 04:00 стартует критический финансовый ETL?\n* Без Preemption прод будет ждать 4 часа, пока аналитики не досчитают свои ad-hoc запросы.\n* С включенным **`yarn.resourcemanager.scheduler.monitor.enable=true`** (Preemption) ResourceManager вежливо убивает (или вытесняет) контейнеры аналитиков в пользу очереди `production`, гарантируя выполнение жестких бизнес-SLA!\n\n#### 3. Мониторинг очередей через CLI:\n```bash\nyarn queue -status root.production\n```"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Выделенная полоса для скорой помощи",
      "content": "Capacity Scheduler с Preemption — это выделенная полоса для спецтранспорта на автомагистрали: обычные машины (аналитики) могут выехать на нее, если на дороге пусто. Но как только сзади появляется скорая помощь с мигалками (production ETL), обычные машины обязаны немедленно перестроиться обратно в свой правый ряд."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение работы кластера без изоляции и с Capacity Scheduler",
        "beforeDescription": "Общая неизолированная очередь (FIFO Scheduler)",
        "beforeColumns": [
          "user_scenario",
          "queue_behavior",
          "business_impact"
        ],
        "beforeRows": [
          [
            "Junior engineer runs bad loop",
            "Hogs 100% of entire cluster",
            "Critical ETL jobs blocked"
          ],
          [
            "CEO dashboard scheduled at 8 AM",
            "Waits behind 50 ad-hoc queries",
            "SLA violation, reports delayed"
          ],
          [
            "Resource contention",
            "Random jobs crash unpredictably",
            "Chaos and team conflicts"
          ]
        ],
        "afterDescription": "Иерархический Capacity Scheduler с Preemption",
        "afterColumns": [
          "user_scenario",
          "queue_behavior",
          "business_impact"
        ],
        "afterRows": [
          [
            "Junior engineer runs bad loop",
            "Capped strictly to root.dev (10%)",
            "Production remains 100% unaffected"
          ],
          [
            "CEO dashboard scheduled at 8 AM",
            "Executes in root.production (70%)",
            "100% on-time daily delivery"
          ],
          [
            "Resource contention",
            "Preemption reclaims needed containers",
            "Predictable multi-tenant governance"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Отсутствие лимита `maximum-am-resource-percent`",
      "content": "В очередь запустили 100 мелких приложений одновременно. Каждое приложение запустило свой контейнер ApplicationMaster. В результате все 100% памяти очереди ушли на работу самих менеджеров приложений (AM), и ни на один реальный рабочий контейнер памяти не осталось! Очередь встала в мертвый клинч (Deadlock). Обязательно ограничивайте `maximum-am-resource-percent = 0.2` (максимум 20% под AM)!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: В чем главное архитектурное различие между Capacity Scheduler и Fair Scheduler?",
      "content": "**Ответ:** Capacity Scheduler ориентирован на крупные организации с жестким бюджетированием очередей по департаментам (гарантированные фиксированные квоты емкости `capacity=X%`). Fair Scheduler ориентирован на максимальное динамическое выравнивание: ресурсы делятся строго поровну между всеми активными пользователями «на лету» без жесткого резервирования."
    }
  ],
  "taskDescription": "Вам необходимо исследовать состояние очереди очередей YARN и запустить Spark-джоб с явным указанием очереди:\n1. Проверьте текущий статус утилизации очереди 'root.production' командой: 'yarn queue -status root.production'.\n2. Отправьте приложение в очередь production с указанием 4 экзекуторов по 4 ГБ памяти:\n   'spark-submit --master yarn --queue production --num-executors 4 --executor-memory 4G etl.py'.\n3. Объедините команды через оператор '&&'.\n\nВведите команду проверки статуса очереди и запуска джоба в указанной очереди.",
  "seedCode": "#!/bin/bash\n# Проверьте статус очереди и отправьте джоб в очередь production\n",
  "initialCode": "yarn queue -status root.production && spark-submit --master yarn --queue production --num-executors 4 --executor-memory 4G etl.py",
  "solutionCode": "yarn queue -status root.production && spark-submit --master yarn --queue production --num-executors 4 --executor-memory 4G etl.py",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "yarn queue -status root.production",
      "spark-submit --master yarn --queue production",
      "--num-executors 4",
      "--executor-memory 4G"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #1106: Блокировка очереди сотнями ApplicationMaster процессов",
    "incidentDescription": "100 параллельных задач запустились в одной очереди, заняв 100% слотов под ApplicationMaster процессы без остатка ресурсов на воркеры.",
    "buggyCode": "<property>\n  <name>yarn.scheduler.capacity.root.dev.maximum-am-resource-percent</name>\n  <value>1.0</value> <!-- 100% отдано под AM! -->\n</property>",
    "fixHint": "Ограничьте долю ресурсов под ApplicationMaster до безопасных 20% (0.2).",
    "solutionCode": "<property>\n  <name>yarn.scheduler.capacity.root.dev.maximum-am-resource-percent</name>\n  <value>0.2</value>\n</property>",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Команда проверки очереди: `yarn queue -status root.production`.",
    "Запуск Spark с указанием очереди выполняется флагом `--queue production`.",
    "Объедините проверку и запуск через оператор `&&`."
  ]
};
