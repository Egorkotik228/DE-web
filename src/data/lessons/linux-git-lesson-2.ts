import { Lesson } from '@/types/course';

export const linuxGitLesson2: Lesson = {
  "id": "linux-git-2",
  "moduleSlug": "linux-git",
  "order": 2,
  "title": "Потоковая обработка данных в Linux: пайпы (|), grep, sed, awk и утилита jq для JSON",
  "estimatedMinutes": 40,
  "glossaryTerms": [
    {
      "term": "Пайплайн (Unix Pipe |)",
      "definition": "Однонаправленный поток байтов в оперативной памяти (буфер ядра), связывающий stdout левого процесса со stdin правого процесса без промежуточной записи на диск."
    },
    {
      "term": "awk",
      "definition": "Язык построчной потоковой обработки структурированных текстовых файлов и логов с автоматическим разделением на поля ($1, $2, ...)."
    },
    {
      "term": "jq",
      "definition": "Высокопроизводительный консольный процессор JSON/NDJSON для фильтрации, маппинга и агрегации древовидных данных в терминале."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "stream_stream_log",
      "description": "Поток логов веб-сервиса авторизации в формате NDJSON",
      "columns": [
        {
          "name": "timestamp",
          "type": "VARCHAR(32)",
          
        },
        {
          "name": "event_type",
          "type": "VARCHAR(32)",
          
        },
        {
          "name": "user_id",
          "type": "VARCHAR(32)",
          
        },
        {
          "name": "response_code",
          "type": "INTEGER",
          
        }
      ],
      "sampleRows": [
        {
          "timestamp": "2026-11-02T01:00:00Z",
          "event_type": "LOGIN",
          "user_id": "u101",
          "response_code": 200
        },
        {
          "timestamp": "2026-11-02T01:00:05Z",
          "event_type": "LOGIN_FAIL",
          "user_id": "u102",
          "response_code": 401
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Потоковая обработка гигабайтных логов в терминале Linux\n\nДата-инженер часто сталкивается с ситуацией: упал ночной пайплайн, а на сервере лежит 50-гигабайтный лог-файл `access.log` или `events.json`. Открыть его в VS Code или nano невозможно — сервер зависнет от исчерпания RAM. Утилиты Linux (`grep`, `sed`, `awk`, `jq`) работают потоково в оперативной памяти, обрабатывая данные со скоростью чтения с диска!\n\n#### 1. Утилита awk: выбор колонок и фильтрация\n`awk` автоматически делит строку на колонки (по пробелам или разделителю `-F`):\n```bash\n# Выбрать IP-адрес ($1) и URL ($7) из лога, где код ответа ($9) равен 500\nawk '$9 == 500 {print $1, $7}' access.log\n\n# Подсчет суммы 3-й колонки в CSV-файле\nawk -F',' '{sum += $3} END {print \"Total:\", sum}' orders.csv\n```\n\n#### 2. Утилита sed: потоковая замена по регулярным выражениям\n```bash\n# Заменить все разделители ';' на ',' без открытия файла в редакторе\nsed -i 's/;/ /g' data.csv\n```\n\n#### 3. Утилита jq: магия парсинга JSON и NDJSON\nСовременные логи и Kafka-сообщения идут в JSON. Утилита `jq` — стандарт де-факто для дата-инженера:\n```bash\n# Фильтрация NDJSON логов: выбрать только строки со статусом ERROR и распечатать user_id\ncat events.json | jq -r 'select(.status == \"ERROR\") | .user_id'\n\n# Извлечь массив объектов и преобразовать в CSV-формат\ncat payload.json | jq -r '.items[] | [.id, .name, .price] | @csv'\n```"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Конвейер против самосвала",
      "content": "Попытка открыть 50 ГБ логов в Python через `pandas.read_csv()` — это попытка вывалить весь груз самосвала в гостиную (Out-Of-Memory). Потоковый конвейер `cat log | grep | jq` — это сортировочная лента в аэропорту: багаж движется по одной чемоданной бирке за раз, пропуская терабайты данных через 10 МБ оперативной памяти."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение методов анализа больших логов",
        "beforeDescription": "Загрузка всего файла в память (Python Pandas / GUI)",
        "beforeColumns": [
          "file_size",
          "ram_consumption",
          "crash_risk"
        ],
        "beforeRows": [
          [
            "10 GB log file",
            "30-40 GB RAM allocated",
            "OOM Killer kills script"
          ],
          [
            "50 GB uncompressed",
            "Server swap thrashing",
            "SSH connection freezes"
          ],
          [
            "Network stream",
            "Cannot process live data",
            "High latency batch only"
          ]
        ],
        "afterDescription": "Потоковый Unix-пайплайн (grep + awk + jq)",
        "afterColumns": [
          "file_size",
          "ram_consumption",
          "crash_risk"
        ],
        "afterRows": [
          [
            "10 GB log file",
            "< 20 MB RAM in buffer",
            "Zero OOM risk"
          ],
          [
            "50 GB uncompressed",
            "Streaming wire speed",
            "Instant first line output"
          ],
          [
            "Network stream",
            "Real-time tailing (tail -f)",
            "Zero latency streaming"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: `cat big_file.txt | grep` без сжатия",
      "content": "При чтении архивных логов распаковка `gunzip -k logs.gz` на диск заполнит 100% хранилища (`No space left on device`). Всегда используйте утилиту `zcat logs.gz | grep ...` или `zgrep`, обрабатывающие сжатые архивы прямо в оперативной памяти!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Что делает команда `sort | uniq -c | sort -nr`?",
      "content": "**Ответ:** Это классический паттерн вычисления частотного распределения (Top-N): `sort` группирует одинаковые строки вместе, `uniq -c` подсчитывает количество повторений каждой строки, а `sort -nr` сортирует результат по числовому значению счетчика в порядке убывания (от самого частого к редкому)."
    }
  ],
  "taskDescription": "Вам передан файл логов заказов 'orders.json' в формате NDJSON (по одному JSON-объекту на строку). Каждый объект имеет вид: `{\"order_id\": \"o1\", \"status\": \"FAILED\", \"amount\": 1500}`.\n\nНапишите однострочный Bash-конвейер с использованием утилиты 'jq', который:\n1. Читает файл 'orders.json'.\n2. Отбирает только заказы со статусом 'FAILED' (через фильтр `select(.status == \"FAILED\")`).\n3. Извлекает поле 'amount' в сыром текстовом виде (флаг `-r`).\n4. Передает поток в утилиту 'awk', которая суммирует все суммы и выводит итоговое число в формате: `awk '{sum += $1} END {print sum}'`.",
  "seedCode": "#!/bin/bash\n# Посчитайте суммарный ущерб от FAILED заказов\n",
  "initialCode": "cat orders.json | jq -r 'select(...) | ...' | awk '...'",
  "solutionCode": "cat orders.json | jq -r 'select(.status == \"FAILED\") | .amount' | awk '{sum += $1} END {print sum}'",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "jq",
      "FAILED",
      "awk",
      "sum"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #602: Падение сборщика аналитики при парсинге поврежденного JSON",
    "incidentDescription": "Пайплайн упал из-за того, что в поток NDJSON попала пустая строка и обрушила скрипт.",
    "buggyCode": "cat stream.json | jq .user_id",
    "fixHint": "Используйте фильтрацию select(. != null) или флаг --compact-output для устойчивой обработки потока.",
    "solutionCode": "cat stream.json | jq -r 'select(. != null) | .user_id'",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Используйте `cat orders.json | jq -r 'select(.status == \"FAILED\") | .amount'` для извлечения сумм.",
    "Передайте результат в пайп `| awk '{sum += $1} END {print sum}'`.",
    "Полная команда: `cat orders.json | jq -r 'select(.status == \"FAILED\") | .amount' | awk '{sum += $1} END {print sum}'`."
  ]
};
