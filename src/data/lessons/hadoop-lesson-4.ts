import { Lesson } from '@/types/course';

export const hadoopLesson4: Lesson = {
  "id": "hadoop-4",
  "moduleSlug": "hadoop",
  "order": 4,
  "title": "NameNode High Availability (HA): Quorum Journal Manager, ZKFC и Split-Brain",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "NameNode High Availability (HA)",
      "definition": "Отказоустойчивая архитектура с двумя узлами NameNode: Active (обрабатывает запросы клиентов) и Standby (горячий синхронизированный резерв)."
    },
    {
      "term": "Quorum Journal Manager (QJM)",
      "definition": "Распределенная система кворумных узлов (JournalNodes), гарантирующая синхронизацию журнала EditLog между Active и Standby NameNodes по большинству голосов (N/2 + 1)."
    },
    {
      "term": "Split-Brain (Расщепление сознания)",
      "definition": "Аварийная ситуация при сетевом разделении (Network Partition), когда оба узла NameNode ошибочно считают себя Active и начинают одновременно модифицировать файловую систему, приводя к повреждению данных."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "namenode_ha_states",
      "description": "Состояние узлов высокой доступности кластера HDFS",
      "columns": [
        {
          "name": "service_id",
          "type": "VARCHAR(16)",
          "keyType": "PK"
        },
        {
          "name": "host_fqdn",
          "type": "VARCHAR(64)"
        },
        {
          "name": "ha_state",
          "type": "VARCHAR(16)"
        },
        {
          "name": "zkfc_health",
          "type": "VARCHAR(16)"
        }
      ],
      "sampleRows": [
        {
          "service_id": "nn1",
          "host_fqdn": "master-01.corp",
          "ha_state": "active",
          "zkfc_health": "HEALTHY"
        },
        {
          "service_id": "nn2",
          "host_fqdn": "master-02.corp",
          "ha_state": "standby",
          "zkfc_health": "HEALTHY"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Отказоустойчивость NameNode High Availability: Как избежать Single Point of Failure\n\nВ ранних версиях Hadoop узел NameNode был единственной точкой отказа (Single Point of Failure, SPOF). Если сервер NameNode сгорал, весь кластер на 2000 серверов останавливался на дни, пока инженеры восстанавливали метаданные из бэкапов.\n\nАрхитектура **NameNode HA** решает эту проблему:\n\n#### 1. Компоненты NameNode HA:\n* **Active NameNode:** принимает запросы чтения/записи от клиентов Spark/Hive, пишет `EditLog` в пул узлов JournalNode.\n* **Standby NameNode:** непрерывно вычитывает свежие изменения из JournalNodes и накатывает их на свою копию метаданных в RAM, находясь в состоянии мгновенной готовности (Hot Standby).\n* **Quorum Journal Manager (QJM):** группа из нечетного числа демонов (3 или 5 JournalNodes). Запись считается успешной, если подтверждена большинством (кворумом, $N/2 + 1$).\n* **ZKFC (ZooKeeper Failover Controller):** локальный демон на каждом мастере, мониторящий здоровье NameNode и удерживающий эфемерный znode в ZooKeeper.\n\n#### 2. Защита от катастрофы Split-Brain (Fencing):\nЕсли моргнет сеть между мастерами, Standby может подумать, что Active умер, и попытаться стать вторым Active. Два активных мастера мгновенно уничтожат файловую систему!\nДля защиты используется **Fencing (Ограждение/Изоляция)**:\n1. Принудительное отключение порта старого мастера по SSH (`sshfence`).\n2. Отключение питания сервера через IPMI/iLO (STONITH — «Shoot The Other Node In The Head»).\n3. QJM гарантирует, что писать в журнал право имеет только один узел с наибольшим Epoch Number."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Два пилота за штурвалом самолета",
      "content": "Active NameNode — это командир воздушного судна (КВС): он держит штурвал и управляет закрылками. Standby NameNode — это второй пилот: он смотрит на приборы и дублирует действия командира. Если КВС теряет сознание, второй пилот мгновенно перехватывает штурвал без потери высоты. А Fencing — это надежный замок на двери кабины, чтобы двое пилотов не начали тянуть штурвал в противоположные стороны."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение Single NameNode и NameNode HA",
        "beforeDescription": "Классический NameNode (Single Point of Failure)",
        "beforeColumns": [
          "failure_scenario",
          "recovery_process",
          "rto_downtime"
        ],
        "beforeRows": [
          [
            "Master server crash",
            "Manual hardware replacement",
            "4-12 hours outage"
          ],
          [
            "Restart NameNode",
            "Re-loads 64GB FSImage in RAM",
            "30-45 minutes safe-mode wait"
          ],
          [
            "Hardware maintenance",
            "Cluster maintenance window required",
            "Downtime announced to company"
          ]
        ],
        "afterDescription": "NameNode High Availability (Active/Standby)",
        "afterColumns": [
          "failure_scenario",
          "recovery_process",
          "rto_downtime"
        ],
        "afterRows": [
          [
            "Master server crash",
            "Automated ZKFC failover",
            "Sub-second seamless recovery"
          ],
          [
            "Restart NameNode",
            "Standby already has RAM warm state",
            "Zero downtime for users"
          ],
          [
            "Hardware maintenance",
            "Manual graceful failover CLI",
            "Zero-downtime rolling upgrades"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Отсутствие настройки метода Fencing в `hdfs-site.xml`",
      "content": "Инженер развернул HA кластер, но не настроил `dfs.ha.fencing.methods`. Во время сетевого разделения автоматический фейловер упал с ошибкой `Unable to fence NameNode`, кластер заблокировался и перешел в аварийный SafeMode, остановив ночной расчет витрин."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Зачем в Quorum Journal Manager (QJM) всегда используют нечетное число серверов (3 или 5)?",
      "content": "**Ответ:** Нечетное число узлов необходимо для формирования строгого большинства (кворума). Кластер из 3 узлов переносит отказ 1 узла ($3/2 + 1 = 2$). Кластер из 4 узлов также переносит отказ только 1 узла ($4/2 + 1 = 3$), но требует на один сервер больше. Четное число узлов не увеличивает надежность и повышает риск разделения пополам (2 vs 2)."
    }
  ],
  "taskDescription": "Вам необходимо проверить текущий статус отказоустойчивости NameNode и выполнить принудительное ручное переключение (graceful failover):\n1. Проверьте HA-статус узла 'nn1' с помощью 'hdfs haadmin -getServiceState nn1'.\n2. Выполните ручное безопасное переключение с узла 'nn1' на резервный 'nn2' командой: 'hdfs haadmin -transitionToActive nn2'.\n\nВведите команду проверки статуса первого узла и перевода второго узла в статус Active.",
  "seedCode": "#!/bin/bash\n# Проверьте статус и переключите NameNode на nn2\n",
  "initialCode": "hdfs haadmin -getServiceState nn1 && hdfs haadmin -transitionToActive nn2",
  "solutionCode": "hdfs haadmin -getServiceState nn1 && hdfs haadmin -transitionToActive nn2",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "hdfs haadmin -getServiceState nn1",
      "hdfs haadmin -transitionToActive nn2"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #1104: Ошибка Split-Brain при ручном переключении без изоляции",
    "incidentDescription": "Инженер форсировал статус Active на втором мастере без выключения первого, вызвав раздвоение журнала EditLog.",
    "buggyCode": "hdfs haadmin -transitionToActive --forcemanual nn2",
    "fixHint": "Используйте автоматический или безопасный failover с обязательным fencing.",
    "solutionCode": "hdfs haadmin -failover nn1 nn2",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Проверка статуса сервиса: `hdfs haadmin -getServiceState nn1`.",
    "Переключение на активный режим: `hdfs haadmin -transitionToActive nn2`.",
    "Объедините команды оператором `&&`."
  ]
};
