import { Lesson } from '@/types/course';

export const dataVaultLesson5: Lesson = {
  "id": "data-vault-5",
  "moduleSlug": "data-vault",
  "order": 5,
  "title": "Продвинутые конструкции: Effectivity Satellites, Hierarchical Links и Tombstones",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "Effectivity Satellite (S_EFF)",
      "definition": "Сателлит линка, фиксирующий период времени (valid_from, valid_to) и статус актуальности (is_active) конкретной связи между бизнес-ключами."
    },
    {
      "term": "Hierarchical Link",
      "definition": "Линк в Data Vault, связывающий две или более ссылки на один и тот же родительский Хаб (например, сотрудник и его начальник)."
    },
    {
      "term": "Tombstone Record",
      "definition": "Специальная запись-метка в сателлите с флагом удаления, фиксирующая факт исчезновения сущности в системе-источнике без физического DELETE в DWH."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "lnk_employee_hierarchy",
      "description": "Иерархический линк: связь сотрудника и его руководителя",
      "columns": [
        {
          "name": "hk_lnk_hierarchy",
          "type": "CHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "hk_employee",
          "type": "CHAR(32)",
          "keyType": "FK"
        },
        {
          "name": "hk_manager",
          "type": "CHAR(32)",
          "keyType": "FK"
        },
        {
          "name": "load_dts",
          "type": "TIMESTAMP"
        },
        {
          "name": "rec_source",
          "type": "VARCHAR(30)"
        }
      ],
      "sampleRows": [
        {
          "hk_lnk_hierarchy": "a1b2c3d4e5f60718293a4b5c6d7e8f90",
          "hk_employee": "e1111111111111111111111111111111",
          "hk_manager": "m2222222222222222222222222222222",
          "load_dts": "2026-11-01 00:00:00",
          "rec_source": "HR_WORKDAY"
        }
      ]
    },
    {
      "tableName": "sat_lnk_effectivity",
      "description": "Effectivity Satellite: интервал актуальности связи между сотрудником и руководителем",
      "columns": [
        {
          "name": "hk_lnk_hierarchy",
          "type": "CHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "load_dts",
          "type": "TIMESTAMP",
          "keyType": "PK"
        },
        {
          "name": "valid_from",
          "type": "TIMESTAMP"
        },
        {
          "name": "valid_to",
          "type": "TIMESTAMP"
        },
        {
          "name": "is_active",
          "type": "BOOLEAN"
        },
        {
          "name": "rec_source",
          "type": "VARCHAR(30)"
        }
      ],
      "sampleRows": [
        {
          "hk_lnk_hierarchy": "a1b2c3d4e5f60718293a4b5c6d7e8f90",
          "load_dts": "2026-11-01 00:00:00",
          "valid_from": "2026-11-01 00:00:00",
          "valid_to": "9999-12-31 23:59:59",
          "is_active": true,
          "rec_source": "HR_WORKDAY"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Иерархические структуры и управление временем связей в Data Vault 2.0\n\nВ реальном бизнесе связи между сущностями не статичны:\n* Сотрудник переходит в другой отдел и получает нового руководителя.\n* Клиент меняет персонального менеджера в банке.\n* Запись удаляется в CRM-системе источника.\n\nТак как Линки в Data Vault строго **Append-Only** (неизменяемы), мы не можем обновить строку в таблице `link`. Для решения этой задачи используются две ключевые конструкции:\n1. **Hierarchical Link:** связывает сущность с экземпляром того же самого Хаба (сотрудник -> менеджер).\n2. **Effectivity Satellite (S_EFF):** вешается на Линк и содержит атрибуты `valid_from`, `valid_to` и `is_active`.\n\n#### Tombstone Satellites (Плиты надгробий)\nФизический `DELETE` в Raw Data Vault строго запрещен: история не должна уничтожаться. Если в источнике запись удалена, в DWH вставляется новая строка в специальный сателлит удалений (Tombstone) с `is_deleted = TRUE` и текущим `load_dts`."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Приказ о назначении руководителя",
      "content": "Hierarchical Link фиксирует сам факт того, что Иванов когда-либо работал под началом Петрова. А Effectivity Satellite — это трудовой договор и приказы: с 1 января по 31 октября начальник — Петров, а с 1 ноября открывается новая строка, где начальник — Сидоров. Старые приказы не сжигаются, они остаются в архиве."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение подходов к изменению связей",
        "beforeDescription": "Мутация связи в реляционной таблице (UPDATE)",
        "beforeColumns": [
          "change_event",
          "update_lock",
          "audit_trail"
        ],
        "beforeRows": [
          [
            "Manager changed",
            "Page lock on link",
            "Old manager lost"
          ],
          [
            "Record deleted",
            "Hard delete row",
            "History wiped out"
          ],
          [
            "Audit request",
            "Cannot prove past state",
            "Compliance violation"
          ]
        ],
        "afterDescription": "Effectivity Satellite в Data Vault 2.0",
        "afterColumns": [
          "change_event",
          "append_pattern",
          "audit_trail"
        ],
        "afterRows": [
          [
            "Manager changed",
            "Insert new version row",
            "Full timeline preserved"
          ],
          [
            "Record deleted",
            "Insert tombstone row",
            "Audit trail 100% intact"
          ],
          [
            "Audit request",
            "Point-in-time reconstruction",
            "Compliant with SOC2/GDPR"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: UPDATE статуса прямо в таблице Link",
      "content": "Разработчик добавил колонку `is_active` прямо в таблицу Link и запустил `UPDATE link SET is_active = false`. В распределенной базе (Greenplum/Postgres) это привело к деградации производительности, эксклюзивным блокировкам страниц и потере истории того, когда именно произошла смена связи."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Как в Data Vault 2.0 отслеживается удаление сущности в источнике?",
      "content": "**Ответ:** Записи в Хабах и Линках не удаляются никогда (они представляют исторический факт существования бизнес-ключа). Факт удаления фиксируется вставкой новой строки в сателлит сущности или отдельный Tombstone Satellite с флагом `is_deleted = true`, текущим штампом `load_dts` и тем же `hash_key`."
    }
  ],
  "taskDescription": "Смоделируйте Effectivity Satellite для отслеживания актуальности связи:\n1. Создайте таблицу сателлита 'sat_employee_eff' (hk_link VARCHAR(32) NOT NULL, load_dts VARCHAR(20) NOT NULL, valid_from VARCHAR(20) NOT NULL, valid_to VARCHAR(20) NOT NULL, is_active BOOLEAN NOT NULL, PRIMARY KEY (hk_link, load_dts)).\n2. Вставьте первую закрытую версию связи сотрудника с руководителем: hk_link = 'lnk_101', load_dts = '2026-01-01', valid_from = '2026-01-01', valid_to = '2026-06-30', is_active = FALSE.\n3. Вставьте вторую активную версию связи с новым руководителем: hk_link = 'lnk_101', load_dts = '2026-07-01', valid_from = '2026-07-01', valid_to = '9999-12-31', is_active = TRUE.\n4. Выберите активную на данный момент запись (где 'is_active = TRUE'), выведя 'hk_link', 'valid_from', 'valid_to', 'is_active'.",
  "seedCode": "",
  "initialCode": "-- 1. Создайте sat_employee_eff\n-- 2. Вставьте две исторические записи\n-- 3. Выведите текущую активную связь",
  "solutionCode": "CREATE TABLE sat_employee_eff (\n    hk_link VARCHAR(32) NOT NULL,\n    load_dts VARCHAR(20) NOT NULL,\n    valid_from VARCHAR(20) NOT NULL,\n    valid_to VARCHAR(20) NOT NULL,\n    is_active BOOLEAN NOT NULL,\n    PRIMARY KEY (hk_link, load_dts)\n);\n\nINSERT INTO sat_employee_eff VALUES\n('lnk_101', '2026-01-01', '2026-01-01', '2026-06-30', FALSE),\n('lnk_101', '2026-07-01', '2026-07-01', '9999-12-31', TRUE);\n\nSELECT hk_link, valid_from, valid_to, is_active\nFROM sat_employee_eff\nWHERE is_active = TRUE;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 0,
    "expectedRowCount": 1,
    "expectedColumns": [
      "hk_link",
      "valid_from",
      "valid_to",
      "is_active"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #505: Мутация таблицы Link вместо Effectivity Satellite",
    "incidentDescription": "ETL пайплайн выполнил UPDATE link_manager_employee SET is_active = false, заблокировав таблицу связей в продакшене.",
    "buggyCode": "UPDATE link_manager_employee SET is_active = false WHERE hk_employee = 'emp_1';",
    "fixHint": "Не модифицируйте таблицу Link. Вставьте новую запись в sat_lnk_effectivity с is_active = false.",
    "solutionCode": "INSERT INTO sat_lnk_effectivity (hk_link, load_dts, valid_from, valid_to, is_active) VALUES ('lnk_1', '2026-11-01', '2026-01-01', '2026-11-01', false);",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Создайте sat_employee_eff с составным PRIMARY KEY (hk_link, load_dts).",
    "Вставьте две строки: одну с is_active = FALSE, другую с is_active = TRUE.",
    "Напишите SELECT hk_link, valid_from, valid_to, is_active FROM sat_employee_eff WHERE is_active = TRUE;."
  ]
};
