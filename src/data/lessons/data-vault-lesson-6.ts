import { Lesson } from '@/types/course';

export const dataVaultLesson6: Lesson = {
  "id": "data-vault-6",
  "moduleSlug": "data-vault",
  "order": 6,
  "title": "Оптимизация чтения: Point-in-Time (PIT) и Bridge таблицы",
  "estimatedMinutes": 40,
  "taskDescription": "Смоделируйте Point-in-Time (PIT) таблицу для быстрого соединения сателлитов:\n1. Создайте таблицу 'pit_customer' (hk_customer VARCHAR(32) NOT NULL, snapshot_dts VARCHAR(20) NOT NULL, sat_profile_load_dts VARCHAR(20), sat_loyalty_load_dts VARCHAR(20), PRIMARY KEY (hk_customer, snapshot_dts)).\n2. Вставьте срез на дату '2026-11-01 00:00:00' для клиента 'hk_c1', указав sat_profile_load_dts = '2026-10-15 12:00:00' и sat_loyalty_load_dts = '2026-10-28 18:30:00'.\n3. Вставьте срез для второго клиента 'hk_c2' на дату '2026-11-01 00:00:00' с sat_profile_load_dts = '2026-10-20 09:00:00' и sat_loyalty_load_dts = NULL.\n4. Выведите все записи 'pit_customer', отсортированные по 'hk_customer ASC'.",
  "glossaryTerms": [
    {
      "term": "Point-in-Time (PIT) Table",
      "definition": "Специализированная таблица в Business Vault, хранящая матрицу ссылок (load_dts) на актуальные версии всех сателлитов сущности на фиксированные моменты времени."
    },
    {
      "term": "Bridge Table",
      "definition": "Таблица в Business Vault, объединяющая ключи нескольких хабов и линков для исключения многоуровневых джойнов в витринах."
    },
    {
      "term": "Cartesian Explosion",
      "definition": "Экспоненциальное размножение строк при джойне версионных таблиц без жесткой фиксации временного среза."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "pit_customer",
      "description": "PIT-таблица клиента: матрица срезов актуальности сателлитов",
      "columns": [
        {
          "name": "hk_customer",
          "type": "CHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "snapshot_dts",
          "type": "TIMESTAMP",
          "keyType": "PK"
        },
        {
          "name": "sat_profile_load_dts",
          "type": "TIMESTAMP"
        },
        {
          "name": "sat_loyalty_load_dts",
          "type": "TIMESTAMP"
        }
      ],
      "sampleRows": [
        {
          "hk_customer": "c1111111111111111111111111111111",
          "snapshot_dts": "2026-11-01 00:00:00",
          "sat_profile_load_dts": "2026-10-15 12:00:00",
          "sat_loyalty_load_dts": "2026-10-28 18:30:00"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Оптимизация чтения: Point-in-Time (PIT) и Bridge таблицы\n\nСырой слой Raw Data Vault оптимизирован для **быстрой параллельной записи**. Но при формировании витрин возникает проблема: у одного Хаба клиентов может быть 5 разных сателлитов, обновляющихся с разной частотой (профиль, биллинг, скоринг, веб-сессии).\n\nЧтобы построить витрину на определенную дату, аналитику пришлось бы сделать 5 подзапросов с `ROW_NUMBER() OVER (...)` или `MAX(load_date) <= T`. На миллиардных таблицах это приводит к падению сервера.\n\n#### Архитектура Point-in-Time (PIT)\nPIT-таблица — это предрассчитанный индекс в Business Vault:\n$$(hk\\_customer, snapshot\\_dts) \\longrightarrow (sat1\\_load\\_dts, sat2\\_load\\_dts, \\dots)$$\n\nБлагодаря PIT-таблице соединение с сателлитами превращается в простой и дешевый **EQUI-JOIN** по составному первичному ключу `(hk_customer, load_dts)`!"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Закладки в каталоге библиотечных карточек",
      "content": "Представьте библиотеку, где у читателя 5 разных формуляров в разных залах. Чтобы узнать состояние читателя на 1 ноября, библиотекарю пришлось бы перерыть сотни страниц в каждом зале. PIT-таблица — это листок-закладка, где уже записано: в зале №1 смотри страницу 45, в зале №2 — страницу 12. Поиск происходит мгновенно."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение производительности запросов витрин",
        "beforeDescription": "Запрос к сырым сателлитам с оконными функциями",
        "beforeColumns": [
          "query_pattern",
          "complexity",
          "execution_time"
        ],
        "beforeRows": [
          [
            "5 Subqueries with ROW_NUMBER",
            "O(N * log N) sort per sat",
            "45-120 minutes"
          ],
          [
            "Non-equi range joins (<= date)",
            "Full table scans",
            "High Memory spill"
          ],
          [
            "Direct BI dashboard queries",
            "Locks database engine",
            "Dashboard timeouts"
          ]
        ],
        "afterDescription": "Запрос через Point-in-Time (PIT) таблицу",
        "afterColumns": [
          "query_pattern",
          "complexity",
          "execution_time"
        ],
        "afterRows": [
          [
            "Precalculated EQUI-JOIN on PK",
            "O(1) Hash / Index Seek",
            "300 milliseconds"
          ],
          [
            "Deterministic point lookup",
            "Zero memory spilling",
            "Predictable RAM usage"
          ],
          [
            "Direct BI dashboard queries",
            "Sub-second response",
            "Happy business users"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Прямые джойны сырых сателлитов в BI-дашбордах",
      "content": "Аналитики подключили PowerBI напрямую к 6 сателлитам Raw Data Vault с оконными функциями. Утренний опрос дашборда 50 пользователями одновременно парализовал кластер хранилища, вызвав Out-Of-Memory во всем DWH."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: В чем разница между PIT и Bridge таблицами?",
      "content": "**Ответ:** PIT-таблица (Point-in-Time) собирает суррогатные ключи и даты срезов сателлитов вокруг **одного хаба** для ускорения версионных выборок. Bridge-таблица собирает вместе суррогатные ключи цепочки нескольких **хабов и связывающих их линков**, устраняя необходимость джойнить граф связей при частых многомерных запросах."
    }
  ],
  "seedCode": "",
  "initialCode": "-- 1. Создайте pit_customer\n-- 2. Вставьте два снимка на 2026-11-01 00:00:00\n-- 3. Выведите данные с сортировкой по hk_customer ASC",
  "solutionCode": "CREATE TABLE pit_customer (\n    hk_customer VARCHAR(32) NOT NULL,\n    snapshot_dts VARCHAR(20) NOT NULL,\n    sat_profile_load_dts VARCHAR(20),\n    sat_loyalty_load_dts VARCHAR(20),\n    PRIMARY KEY (hk_customer, snapshot_dts)\n);\n\nINSERT INTO pit_customer VALUES\n('hk_c1', '2026-11-01 00:00:00', '2026-10-15 12:00:00', '2026-10-28 18:30:00'),\n('hk_c2', '2026-11-01 00:00:00', '2026-10-20 09:00:00', NULL);\n\nSELECT hk_customer, snapshot_dts, sat_profile_load_dts, sat_loyalty_load_dts\nFROM pit_customer\nORDER BY hk_customer ASC;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 0,
    "expectedRowCount": 2,
    "expectedColumns": [
      "hk_customer",
      "snapshot_dts",
      "sat_profile_load_dts",
      "sat_loyalty_load_dts"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #506: Оконные функции обрушили витрину на 50 млн записей",
    "incidentDescription": "Запрос витрины выполнял 6 тяжелых оконных функций ROW_NUMBER() OVER(PARTITION BY hk ORDER BY load_date DESC) в режиме реального времени.",
    "buggyCode": "SELECT * FROM (SELECT *, ROW_NUMBER() OVER(PARTITION BY hk ORDER BY dts DESC) rn FROM sat_a) a JOIN (SELECT *, ROW_NUMBER() OVER(PARTITION BY hk ORDER BY dts DESC) rn FROM sat_b) b ON a.hk = b.hk WHERE a.rn = 1 AND b.rn = 1;",
    "fixHint": "Используйте PIT-таблицу pit_customer с предрассчитанными датами загрузки для прямого equi-join.",
    "solutionCode": "SELECT a.*, b.* FROM pit_customer p JOIN sat_a a ON p.hk = a.hk AND p.sat_a_dts = a.dts JOIN sat_b b ON p.hk = b.hk AND p.sat_b_dts = b.dts WHERE p.snapshot_dts = '2026-11-01';",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Создайте таблицу pit_customer с первичным ключом PRIMARY KEY (hk_customer, snapshot_dts).",
    "Вставьте две строки с датой среза '2026-11-01 00:00:00'.",
    "Выведите все колонки с сортировкой ORDER BY hk_customer ASC;."
  ]
};
