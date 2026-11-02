import { Lesson } from '@/types/course';

export const linuxGitLesson1: Lesson = {
  "id": "linux-git-1",
  "moduleSlug": "linux-git",
  "order": 1,
  "title": "Bash и файловая система: навигация, права доступа (chmod/chown), переменные окружения и управление процессами",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "Права доступа (POSIX permissions)",
      "definition": "Битовая маска доступа rwx (read, write, execute) для владельца (u), группы (g) и остальных (o), задаваемая символьно или восьмерично (например, 755 или 644)."
    },
    {
      "term": "Переменные окружения (Environment Variables)",
      "definition": "Динамические пары ключ-значение (PATH, ENV, SECRET_KEY), доступные процессам ОС и наследуемые дочерними процессами через export."
    },
    {
      "term": "nohup и сигналы (kill/HUP)",
      "definition": "nohup игнорирует сигнал SIGHUP (обрыв терминала SSH), позволяя долгоживущему процессу продолжить работу в фоне даже после закрытия сессии."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "process_inventory",
      "description": "Снимок запущенных процессов дата-пайплайна в ОС",
      "columns": [
        {
          "name": "pid",
          "type": "INTEGER",
          "keyType": "PK"
        },
        {
          "name": "user",
          "type": "VARCHAR(32)"
        },
        {
          "name": "command",
          "type": "VARCHAR(128)"
        },
        {
          "name": "status",
          "type": "VARCHAR(16)"
        }
      ],
      "sampleRows": [
        {
          "pid": 1024,
          "user": "dataeng",
          "command": "python etl_daily.py",
          "status": "RUNNING"
        },
        {
          "pid": 1056,
          "user": "dataeng",
          "command": "spark-submit job.py",
          "status": "SLEEPING"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Архитектура Linux для Data Engineer: Файловая система и процессы\n\nСерверы хранилищ данных (ClickHouse, Postgres, Spark-воркеры, Airflow) работают на базе Linux. Инженер обязан уверенно ориентироваться в терминале, понимать модель прав доступа и уметь управлять процессами.\n\n#### 1. Модель прав доступа: rwx и восьмеричная система\nКаждый файл и директория имеют права для трех категорий пользователей:\n- **User (u):** владелец файла.\n- **Group (g):** группа владельца.\n- **Others (o):** все остальные.\n\nЗначения битов: Read (`r` = 4), Write (`w` = 2), Execute (`x` = 1).\n* `chmod 755 script.sh` -> `rwxr-xr-x` (владелец делает всё, остальные читают и запускают).\n* `chmod 600 id_rsa` -> `rw-------` (строго для SSH-ключей и паролей).\n* `chown dataeng:analytics /opt/data` -> смена владельца и группы.\n\n#### 2. Переменные окружения\nКоманда `export DB_HOST='10.0.0.5'` передает переменную всем дочерним процессам. Переменная `PATH` определяет директории, в которых командная оболочка ищет исполняемые файлы.\n\n#### 3. Управление фоновыми процессами\n* `ps aux | grep python` — поиск PID нужного скрипта.\n* `nohup python -u ingest.py > ingest.log 2>&1 &` — запуск в фоне с защитой от обрыва SSH-сессии.\n* `kill -15 <PID>` (SIGTERM) — мягкое завершение с сохранением состояния.\n* `kill -9 <PID>` (SIGKILL) — немедленное принудительное уничтожение процесса ядром."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Паспорт, ключ и охранник",
      "content": "Права доступа chmod 755 — это ключ от переговорной комнаты: владелец может делать презентацию и стирать маркерную доску (rwx), а гости могут только слушать и смотреть (r-x). Команда `nohup` — это охранник, которому вы дали распоряжение не выгонять фонового уборщика (ETL-скрипт), даже если генеральный директор закрыл кабинет и уехал домой."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение способов запуска долгоживущих задач",
        "beforeDescription": "Запуск в активной SSH-сессии (без nohup / screen)",
        "beforeColumns": [
          "launch_method",
          "ssh_disconnect_effect",
          "process_fate"
        ],
        "beforeRows": [
          [
            "Direct bash run",
            "SIGHUP signal sent",
            "Process killed immediately"
          ],
          [
            "Output to stdout",
            "Terminal buffer freeze",
            "ETL job halts mid-way"
          ],
          [
            "Manual monitoring",
            "Laptop goes to sleep",
            "Pipeline fails with lock"
          ]
        ],
        "afterDescription": "Запуск через nohup в фоновом режиме (&)",
        "afterColumns": [
          "launch_method",
          "ssh_disconnect_effect",
          "process_fate"
        ],
        "afterRows": [
          [
            "nohup + background &",
            "SIGHUP ignored by process",
            "Runs until completion"
          ],
          [
            "Redirected to log file",
            "Zero terminal dependency",
            "Full execution audit"
          ],
          [
            "Detached background",
            "Safe to close laptop",
            "Process continues on server"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: `kill -9` в момент транзакции БД",
      "content": "Инженер увидел зависший процесс импорта в Postgres и выполнил `kill -9 <PID>` родительского процесса базы. База аварийно упала, откатилась в recovery-режим и перешла в режим долгого восстановления WAL, заблокировав аналитический кластер на 3 часа. Всегда начинайте с вежливого `kill -15` (SIGTERM)."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Чем `export VAR=val` отличается от простого `VAR=val` в Bash?",
      "content": "**Ответ:** `VAR=val` задает локальную переменную текущей командной оболочки, которая недоступна дочерним процессам. Команда `export VAR=val` помещает переменную в таблицу окружения (environment), поэтому любые скрипты, программы (Python, Java) и дочерние шеллы, запущенные из этого терминала, унаследуют это значение."
    }
  ],
  "taskDescription": "Вам необходимо подготовить окружение для запуска дата-скрипта:\n1. Создайте исполняемый Bash-скрипт 'run_pipeline.sh', установив для него права на исполнение только для владельца (chmod 700).\n2. Экспортируйте переменную окружения DATA_ENV со значением 'production'.\n3. Запустите скрипт в фоновом режиме с игнорированием сигналов обрыва связи nohup, перенаправив стандартный вывод и ошибки в 'pipeline.log'.\n\nВведите Bash-команду, которая выполняет корректный фоновый запуск скрипта './run_pipeline.sh' через nohup с перенаправлением всех потоков в 'pipeline.log'.",
  "seedCode": "#!/bin/bash\n# Подготовьте запуск фонового процесса\n",
  "initialCode": "# Запустите ./run_pipeline.sh в фоне через nohup с перенаправлением stdout и stderr в pipeline.log\n",
  "solutionCode": "nohup ./run_pipeline.sh > pipeline.log 2>&1 &",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "nohup",
      "pipeline.log",
      "&"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #601: Падение ночного пайплайна при разрыве Wi-Fi инженера",
    "incidentDescription": "Дата-инженер запустил скрипт миграции базы данных 'python migrate.py' в терминале со своего ноутбука. По пути домой ноутбук отключился от VPN, сессия SSH закрылась, процесс получил сигнал SIGHUP и миграция упала наполовину.",
    "buggyCode": "python migrate.py > migrate.log",
    "fixHint": "Используйте nohup и фоновый запуск (&), чтобы изолировать процесс от закрытия SSH-сессии.",
    "solutionCode": "nohup python migrate.py > migrate.log 2>&1 &",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Команда nohup защищает процесс от сигнала SIGHUP при закрытии терминала.",
    "Для перенаправления stdout в файл используется '> pipeline.log', а для объединения stderr со stdout — '2>&1'.",
    "Символ '&' в самом конце команды отправляет процесс на выполнение в фоновый режим: 'nohup ./run_pipeline.sh > pipeline.log 2>&1 &'."
  ]
};
