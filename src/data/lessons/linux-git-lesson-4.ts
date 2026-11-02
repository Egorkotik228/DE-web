import { Lesson } from '@/types/course';

export const linuxGitLesson4: Lesson = {
  "id": "linux-git-4",
  "moduleSlug": "linux-git",
  "order": 4,
  "title": "Автоматизация и планирование: надежные Bash-скрипты (set -euo pipefail), логирование и cron / systemd",
  "estimatedMinutes": 40,
  "glossaryTerms": [
    {
      "term": "set -euo pipefail (Unofficial Bash Strict Mode)",
      "definition": "Золотой стандарт безопасности Bash: -e завершает скрипт при любой ошибке, -u выбрасывает ошибку при обращении к необъявленной переменной, -o pipefail передает код ошибки из любого звена пайплайна."
    },
    {
      "term": "cron",
      "definition": "Традиционный демон-планировщик задач в Unix/Linux, запускающий команды по расписанию из 5 полей (минуты, часы, дни, месяцы, дни недели)."
    },
    {
      "term": "systemd Timer",
      "definition": "Современная замена cron в дистрибутивах Linux с миллисекундной точностью, зависимостями сервисов, cgroups-изоляцией и централизованным логированием через journalctl."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "scheduled_jobs",
      "description": "Реестр регулярных задач дата-платформы в cron/systemd",
      "columns": [
        {
          "name": "job_id",
          "type": "VARCHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "schedule",
          "type": "VARCHAR(32)",
          
        },
        {
          "name": "command",
          "type": "VARCHAR(128)",
          
        },
        {
          "name": "strict_mode",
          "type": "BOOLEAN",
          
        }
      ],
      "sampleRows": [
        {
          "job_id": "sync_crm",
          "schedule": "0 2 * * *",
          "command": "/opt/scripts/sync_crm.sh",
          "strict_mode": true
        },
        {
          "job_id": "vacuum_db",
          "schedule": "0 4 * * 0",
          "command": "/opt/scripts/vacuum_dwh.sh",
          "strict_mode": true
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Надежные Bash-скрипты промышленного уровня для Data Engineering\n\nБольшинство самописных Bash-скриптов в дата-командах — это мины замедленного действия. Если команда в середине скрипта падает, Bash по умолчанию продолжает выполнять следующие строки, уничтожая данные или создавая фантомные успешные отчеты!\n\n#### 1. Золотой стандарт надежности: `set -euo pipefail`\nКаждый производственный скрипт обязан начинаться со строк:\n```bash\n#!/usr/bin/env bash\nset -euo pipefail\nIFS=$'\\n\\t'\n```\n* `set -e`: прерывает выполнение при ненулевом коде возврата любой команды.\n* `set -u`: падает при попытке прочитать необъявленную переменную (защита от смертельного `rm -rf /opt/$UNDEFINED_VAR/data`).\n* `set -o pipefail`: если в цепочке `curl | grep | jq` упадет `curl`, весь пайплайн вернет статус ошибки, а не статус последней успешной утилиты `jq`!\n\n#### 2. Перехват ошибок и очистка: `trap`\nКонструкция `trap` гарантирует выполнение команды очистки (удаление временных файлов, разблокировка мьютекса) даже при аварийном падении скрипта:\n```bash\ntmp_file=$(mktemp)\ntrap 'rm -f \"$tmp_file\"; echo \"[CLEANUP DONE]\"' EXIT\n```\n\n#### 3. Расписание: cron vs systemd Timers\n* **Cron синтаксис:** `0 3 * * * /opt/etl/daily.sh >> /var/log/etl.log 2>&1` (каждый день в 03:00).\n* **Systemd timers:** дают надежный перезапуск при сбоях (`Restart=on-failure`), логирование в `journalctl -u my_job.service` и контроль потребления памяти через `MemoryMax=4G`."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Самолетный чек-лист с катапультированием",
      "content": "Обычный Bash без `set -e` — это слепой автопилот: если в полете отказал правый двигатель, он продолжает лететь по маршруту, пока не врежется в гору. Режим `set -euo pipefail` немедленно глушит двигатели и катапультирует пилота при малейшей неисправности, не давая натворить непоправимых бед."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение надежности Bash-скриптов",
        "beforeDescription": "Стандартный Bash-скрипт (без strict mode)",
        "beforeColumns": [
          "failure_scenario",
          "bash_behavior",
          "production_outcome"
        ],
        "beforeRows": [
          [
            "Mid-script SQL fails",
            "Continues to next lines",
            "Corrupted state saved"
          ],
          [
            "Typo in env variable",
            "Evaluates to empty string",
            "rm -rf / danger"
          ],
          [
            "Broken pipe source",
            "Ignores pipe failure",
            "Silent data loss"
          ]
        ],
        "afterDescription": "Строгий режим (set -euo pipefail + trap)",
        "afterColumns": [
          "failure_scenario",
          "bash_behavior",
          "production_outcome"
        ],
        "afterRows": [
          [
            "Mid-script SQL fails",
            "Immediate exit with code",
            "Rollback triggered"
          ],
          [
            "Typo in env variable",
            "Script aborts with error",
            "File system protected"
          ],
          [
            "Broken pipe source",
            "pipefail catches exit code",
            "Airflow marks task FAILED"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: `rm -rf /${DATA_DIR}` при пустой переменной",
      "content": "В скрипте очистки написали `rm -rf /${DATA_DIR}/*`. При запуске в cron переменная `DATA_DIR` не была экспортирована и оказалась пустой. Команда превратилась в `rm -rf //*` и стерла всю корневую файловую систему сервера. С флагом `set -u` скрипт упал бы с безопасной ошибкой `DATA_DIR: unbound variable`."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Зачем нужен `set -o pipefail`, если уже включен `set -e`?",
      "content": "**Ответ:** По умолчанию в Bash код возврата конвейера `cmd1 | cmd2 | cmd3` равен коду возврата последней команды `cmd3`. Если упадет `cmd1` (например, база упала и вернула 1), а `cmd3` успешно прочитал пустой ввод и завершился с кодом 0, то `set -e` посчитает весь пайплайн успешным! Опция `pipefail` заставляет весь конвейер возвращать код ошибки, если хоть одна команда упала."
    }
  ],
  "taskDescription": "Напишите безопасный шаблон Bash-скрипта очистки логов 'clean_logs.sh':\n1. Включите строгий режим выполнения 'set -euo pipefail'.\n2. Объявите переменную 'TARGET_DIR' со значением '/var/log/etl'.\n3. Настройте перехватчик 'trap', который при завершении скрипта (EXIT) выводит сообщение 'Cleanup process completed'.\n4. Добавьте проверку: если директория существует ('[ -d \"$TARGET_DIR\" ]'), вывести 'Directory found: $TARGET_DIR'.\n\nВведите полный надежный скрипт Bash, соблюдающий стандарт 'set -euo pipefail' и конструкцию 'trap'.",
  "seedCode": "#!/usr/bin/env bash\n# Напишите безопасный Bash-скрипт\n",
  "initialCode": "#!/usr/bin/env bash\nset -euo pipefail\n\nTARGET_DIR=\"/var/log/etl\"\ntrap 'echo \"Cleanup process completed\"' EXIT\n\nif [ -d \"$TARGET_DIR\" ]; then\n    echo \"Directory found: $TARGET_DIR\"\nfi",
  "solutionCode": "#!/usr/bin/env bash\nset -euo pipefail\n\nTARGET_DIR=\"/var/log/etl\"\ntrap 'echo \"Cleanup process completed\"' EXIT\n\nif [ -d \"$TARGET_DIR\" ]; then\n    echo \"Directory found: $TARGET_DIR\"\nfi",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "set -euo pipefail",
      "TARGET_DIR",
      "trap",
      "EXIT",
      "if [ -d"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #604: Случайное удаление файлов из-за необъявленной переменной",
    "incidentDescription": "Скрипт выполнил rm -rf $BACKUP_PATH/*, когда переменная не была определена в cron, стерев системные файлы.",
    "buggyCode": "#!/bin/bash\nrm -rf $BACKUP_PATH/*",
    "fixHint": "Добавьте set -euo pipefail в начало скрипта для защиты от пустых переменных.",
    "solutionCode": "#!/usr/bin/env bash\nset -euo pipefail\nrm -rf \"${BACKUP_PATH:?Error: BACKUP_PATH is not set}\"/*",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Начните скрипт со строки `#!/usr/bin/env bash` и директивы `set -euo pipefail`.",
    "Зарегистрируйте обработчик выхода: `trap 'echo \"Cleanup process completed\"' EXIT`.",
    "Проверьте наличие директории через `if [ -d \"$TARGET_DIR\" ]; then echo \"Directory found: $TARGET_DIR\"; fi`."
  ]
};
