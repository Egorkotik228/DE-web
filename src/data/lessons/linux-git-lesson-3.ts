import { Lesson } from '@/types/course';

export const linuxGitLesson3: Lesson = {
  "id": "linux-git-3",
  "moduleSlug": "linux-git",
  "order": 3,
  "title": "Сети, диагностика и мониторинг диска: curl, ss, lsof, df/du, iostat и OOM-killer",
  "estimatedMinutes": 40,
  "glossaryTerms": [
    {
      "term": "OOM Killer (Out-of-Memory Killer)",
      "definition": "Защитный механизм ядра Linux, который при полном исчерпании доступной оперативной памяти принудительно убивает процесс с наибольшим oom_score (код выхода 137)."
    },
    {
      "term": "lsof (List Open Files)",
      "definition": "Системная утилита, выводящая список всех открытых файлов, директорий, сокетов и сетевых портов процессами в ОС."
    },
    {
      "term": "I/O Wait (%iowait)",
      "definition": "Процент процессорного времени, в течение которого CPU простаивает в ожидании завершения операций чтения/записи на диск или в сеть."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "disk_mounts_inventory",
      "description": "Снимок файловых систем и использования хранилища DWH",
      "columns": [
        {
          "name": "filesystem",
          "type": "VARCHAR(64)",
          "keyType": "PK"
        },
        {
          "name": "mount_point",
          "type": "VARCHAR(128)",
          
        },
        {
          "name": "used_percent",
          "type": "VARCHAR(8)",
          
        },
        {
          "name": "available_space",
          "type": "VARCHAR(16)",
          
        }
      ],
      "sampleRows": [
        {
          "filesystem": "/dev/sda1",
          "mount_point": "/",
          "used_percent": "42%",
          "available_space": "120G"
        },
        {
          "filesystem": "/dev/nvme0n1",
          "mount_point": "/var/lib/clickhouse",
          "used_percent": "94%",
          "available_space": "28G"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Диагностика сетевых задержек, диска и памяти на серверах DWH\n\nКогда аналитический кластер перестает отвечать, дата-инженер должен за 2 минуты локализовать проблему: «Забился диск? Завис сетевой сокет? Процесс убит OOM Killer? Или диск перегружен I/O?»\n\n#### 1. Мониторинг дискового пространства: df и du\n* `df -h` — показывает процент заполнения точек монтирования (дисков). Если занято > 95%, базы данных (Postgres, ClickHouse) переходят в Read-Only.\n* `du -sh /var/log/* | sort -hr | head -n 10` — поиск 10 самых тяжелых директорий или логов.\n\n#### 2. Скрытые файлы и lsof\nЕсли вы удалили 100-гигабайтный файл через `rm huge.log`, но `df -h` по-прежнему показывает 100% занятости — файл все еще открыт работающим процессом (unlinked open file):\n```bash\nlsof +L1 # показывает файлы с 0 ссылок на диск, удерживаемые процессами\n```\n\n#### 3. Диагностика сети и портов: ss и curl\n* `ss -tulwn` или `netstat -tlpn` — список открытых портов (слушает ли ClickHouse порт 8123 или 9000).\n* `curl -Iv https://api.internal.svc:8080/health` — проверка доступности эндпоинта с замером времени TLS/DNS рукопожатия.\n\n#### 4. Память и ядро: free, dmesg и OOM Killer\n* `free -h` — объем свободной памяти (обращайте внимание на колонку `available`, а не `free`).\n* `dmesg -T | grep -i oom` — просмотр логов ядра ОС для обнаружения убийства процессов (например, Java Spark Driver или Python-пайплайна)."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Врач скорой помощи на сервере",
      "content": "Диагностика сервера похожа на триаж в реанимации: `top` — измерение пульса (загрузка ядер), `free -h` — уровень кислорода в крови (RAM), `df -h` — наличие свободного дыхания в легких (диск), а `dmesg | grep oom` — патологоанатомический отчет, если кто-то из пациентов внезапно исчез."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение инструментов диагностики инцидентов",
        "beforeDescription": "Медленные и неинформативные методы",
        "beforeColumns": [
          "diagnostic_task",
          "slow_approach",
          "blind_spot"
        ],
        "beforeRows": [
          [
            "Find heavy directory",
            "du -h / (recursive scan)",
            "Takes 3 hours on NVMe"
          ],
          [
            "Check port listening",
            "Try connecting via browser",
            "No error details"
          ],
          [
            "Investigate killed job",
            "Guess random reason",
            "Ignore kernel log"
          ]
        ],
        "afterDescription": "Профессиональный арсенал дата-инженера",
        "afterColumns": [
          "diagnostic_task",
          "slow_approach",
          "blind_spot"
        ],
        "afterRows": [
          [
            "Find heavy directory",
            "du -sh /var/* | sort -hr",
            "Instant top-10 identification"
          ],
          [
            "Check port listening",
            "ss -tlpn | grep 5432",
            "Exact PID and process name"
          ],
          [
            "Investigate killed job",
            "dmesg -T | grep -i oom",
            "Exact kill reason with code 137"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Очистка диска через `rm active_stream.log`",
      "content": "Инженер удалил лог `rm access.log`, в который веб-сервер продолжал писать 50 МБ/сек. Место на диске не освободилось (дескриптор открыт), но файл пропал из файловой системы. Единственный способ обнулить файл без рестарта сервиса: `truncate -s 0 access.log` или `> access.log`."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Почему `df -h` показывает 100% disk usage, хотя `du -sh /*` насчитал занятым всего 20 ГБ из 100 ГБ?",
      "content": "**Ответ:** Это классическая проблема удаленных файлов, удерживаемых открытыми файловыми дескрипторами (deleted unlinked files). Процесс продолжает писать в удаленный файл. Найти такие файлы можно командой `lsof | grep deleted`, а освободить место — перезапуском процесса либо его завершением."
    }
  ],
  "taskDescription": "Вам необходимо исследовать сервер, на котором внезапно упал Spark-драйвер с кодом 137:\n1. Проверьте журнал системных сообщений ядра на наличие срабатывания OOM Killer с помощью 'dmesg | grep -i oom'.\n2. Проверьте свободное дисковое пространство в человекочитаемом формате с помощью команды 'df -h'.\n3. Проверьте открытые сетевые сокеты TCP в режиме прослушивания без резолва имен с помощью утилиты 'ss -tlpn'.\n\nВведите команду для выявления 5 самых тяжелых директорий в папке '/var/log', отсортированных по размеру в порядке убывания в человекочитаемом формате ('du -sh /var/log/* | sort -hr | head -n 5').",
  "seedCode": "#!/bin/bash\n# Найдите топ-5 самых тяжелых каталогов\n",
  "initialCode": "du ... /var/log/* | sort ... | head -n 5",
  "solutionCode": "du -sh /var/log/* | sort -hr | head -n 5",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "du",
      "-sh",
      "sort",
      "-hr",
      "head",
      "-n",
      "5"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #603: Зависание дисковой подсистемы из-за удаления открытого лога",
    "incidentDescription": "Инженер удалил файл `rm /var/log/ingest.log`, но место не освободилось, и база упала с ошибкой Disk Full.",
    "buggyCode": "rm /var/log/ingest.log",
    "fixHint": "Используйте обнуление файла > /var/log/ingest.log или найдите держащий его процесс через lsof | grep deleted.",
    "solutionCode": "> /var/log/ingest.log",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Команда `du -sh /var/log/*` считает суммарный размер каждой директории первого уровня.",
    "Для сортировки размеров с суффиксами (K, M, G) используется флаг `-h` у команды sort: `sort -hr`.",
    "Итоговый конвейер: `du -sh /var/log/* | sort -hr | head -n 5`."
  ]
};
