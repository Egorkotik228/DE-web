import { Lesson } from '@/types/course';
import { pythonLesson1 } from './python-lesson-1';
import { pythonLesson2 } from './python-lesson-2';
import { pythonLesson3 } from './python-lesson-3';
import { pythonLesson4 } from './python-lesson-4';

export const pythonLessons: Lesson[] = [
  pythonLesson1,
  pythonLesson2,
  pythonLesson3,
  pythonLesson4,
  {
    id: 'python-5',
    moduleSlug: 'python',
    order: 5,
    title: 'Потоковая обработка файлов через генераторы (yield) без OOM',
    estimatedMinutes: 30,
    glossaryTerms: [
      { term: 'Generator', definition: 'Специальная функция в Python, использующая ключевое слово yield, которая возвращает ленивый итератор и не хранит всю последовательность в RAM.' },
      { term: 'OOM Killer', definition: 'Out Of Memory Killer — механизм ядра Linux, принудительно убивающий процесс (SIGKILL, код 137) при исчерпании доступной оперативной памяти.' },
      { term: 'Streaming I/O', definition: 'Потоковый ввод-вывод, при котором данные считываются с диска или сети фиксированными чанками по мере готовности.' },
    ],
    schemaPreview: [
      {
        tableName: 'server_access_log',
        description: 'Сырой текстовый лог NGINX на диске',
        columns: [
          { name: 'raw_line', type: 'TEXT' },
        ],
        sampleRows: [
          { raw_line: '192.168.1.10 - - [31/Oct/2026:12:00:01 +0300] "GET /api/v1/checkout HTTP/1.1" 200 1420' },
          { raw_line: '10.0.0.5 - - [31/Oct/2026:12:00:02 +0300] "POST /api/v1/auth HTTP/1.1" 500 234' },
          { raw_line: '172.16.0.4 - - [31/Oct/2026:12:00:05 +0300] "GET /health HTTP/1.1" 200 12' },
        ],
      },
    ],
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Управление памятью CPython: как убить сервер одной строчкой кода

В стандартной реализации Python (CPython) каждый объект в оперативной памяти оборачивается в тяжелую структуру \`PyObject\`. Простое целое число в Python 3 весит **28 байт** (вместо нативных 4 байт в C), а пустая строка — **49 байт**!

Когда начинающий дата-инженер пишет:
\`\`\`python
# ❌ КАТАСТРОФА ДЛЯ ПАМЯТИ
with open("huge_access.log", "r") as f:
    lines = f.readlines()  # Загружает ВСЕ строки файла в RAM!
\`\`\`
Файл логов размером 10 ГБ на диске при превращении в список строк Python раздувается в оперативной памяти до **25–40 Гигабайт** из-за накладных расходов на объекты строк и указатели массива. Если на сервере воркера Airflow выделено 8 ГБ RAM, ядро Linux мгновенно присылает сигнал **SIGKILL (Exit Code 137)** — знаменитый **Linux OOM Killer**.

#### Ленивые вычисления и магия генераторов (yield)
Вместо материализации списков в памяти инженер данных обязан использовать **потоковые генераторы (Generators)**.

Когда функция содержит ключевое слово \`yield\`, при вызове она **НЕ исполняет** свой код немедленно. Она возвращает объект генератора — машину состояний (State Machine).
При каждом обращении к генератору (через функцию \`next()\` или цикл \`for\`) код функции исполняется ровно до следующего \`yield\`, возвращает одно значение и **замораживает свое состояние** (локальные переменные, указатель инструкций).

\`\`\`python
# ✅ ПОТРЕБЛЕНИЕ ПАМЯТИ: СТРОГО 8 КБ НА ЛЮБОЙ РАЗМЕР ФАЙЛА
def parse_error_logs(file_path: str):
    """Генератор, фильтрующий 500-е ошибки на лету."""
    with open(file_path, "r", encoding="utf-8") as f:
        # Сам объект файла f в Python уже является генератором!
        for line in f:
            if " 500 " in line:
                yield line.strip()
\`\`\`

#### Паттерн конвейера генераторов (Pipeline Pattern)
Генераторы можно соединять в конвейеры (как UNIX pipes \`|\`), передавая один генератор на вход другому. Данные текут по цепочке элемент за элементом, обеспечивая минимальное потребление RAM и мгновенный старт обработки без ожидания чтения всего файла!`,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Водопровод против цистерны',
        content: `Представьте, что вам нужно выпить стакан воды из реки.
        
Подход \`f.readlines()\` — это подогнать к реке 10-тонную цистерну, выкачать всю реку в цистерну, привезти ее в город, и только потом налить себе стакан воды. Цистерна сломает мост (OOM Killer).
        
Подход генераторов (\`yield\`) — это проложить водопроводную трубу. Вы открываете кран, набираете ровно один стакан свежей воды (\`yield\`), выпиваете его, а остальная вода спокойно течет в реке, не занимая ни миллилитра в вашей квартире.`,
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Одноразовость генератора',
        content: `Самый коварный баг при работе с генераторами — попытка обойти их дважды:
\`\`\`python
gen = (x * 2 for x in [1, 2, 3])
print(list(gen))  # Выведет: [2, 4, 6]
print(list(gen))  # Выведет: [] (ПУСТОЙ СПИСОК!)
\`\`\`
Генератор исчерпывается после первого полного прохода (выбрасывает исключение \`StopIteration\`). 
Если вы передали генератор в функцию расчета среднего, а потом попытались передать его же в функцию расчета дисперсии — вторая функция получит 0 строк и вернет неверный результат или упадет с делением на ноль!
        
**Решение:** Если данные требуются повторно, генератор сохраняют во временный Parquet/диск, либо пересоздают заново.`,
      },
      {
        type: 'callout',
        variant: 'interview',
        title: '🎯 Спросят на собесе: В чем разница между итератором и генератором?',
        content: `**Ответ:** 
- **Итератор (Iterator)** — это любой объект, реализующий протокол итератора: метод \`__iter__()\` (возвращает сам себя) и метод \`__next__()\` (возвращает следующий элемент или бросает \`StopIteration\`).
- **Генератор (Generator)** — это подвид итератора, создаваемый наиболее простым способом: либо через функцию с ключевым словом \`yield\`, либо через выражение генератора (\`generator expression\`: \`(x for x in data)\`). Генератор автоматически реализует методы \`__iter__\` и \`__next__\` и сохраняет свое локальное состояние между вызовами.`,
      },
    ],
    taskDescription: `Напишите функцию-генератор 'stream_filter_transactions(transactions, min_amount)', которая принимает список или итератор словарей транзакций и числовой порог 'min_amount'. Генератор должен отфильтровать только успешные транзакции ('status == "SUCCESS"') с суммой 'amount >= min_amount', преобразуя каждую в кортеж '(transaction_id, round(amount, 2))'.`,
    seedCode: `# Тестовый датасет
transactions_data = [
    {"id": "tx_101", "amount": 150.758, "status": "SUCCESS"},
    {"id": "tx_102", "amount": 25.00, "status": "FAILED"},
    {"id": "tx_103", "amount": 540.201, "status": "SUCCESS"},
    {"id": "tx_104", "amount": 80.00, "status": "SUCCESS"},
    {"id": "tx_105", "amount": 1200.00, "status": "PENDING"},
]`,
    initialCode: `def stream_filter_transactions(transactions, min_amount):
    """
    Генераторная функция для потоковой фильтрации транзакций.
    Возвращает кортежи (transaction_id, rounded_amount).
    """
    # Ваш код с ключевым словом yield
    pass`,
    solutionCode: `def stream_filter_transactions(transactions, min_amount):
    for tx in transactions:
        if tx.get("status") == "SUCCESS" and tx.get("amount", 0) >= min_amount:
            yield (tx["id"], round(tx["amount"], 2))`,
    testConfig: {
      checkOrder: true,
      floatPrecision: 2,
    },
    brokenProdTask: {
      title: 'Инцидент #108: Память упала из-за list comprehension вместо generator expression',
      incidentDescription: 'В ETL-скрипте разработчик заменил круглые скобки на квадратные, создав список на 20 миллионов элементов в оперативной памяти, что привело к OOM на проде.',
      buggyCode: `def process_records(stream):
    # Квадратные скобки материализуют 20M записей в памяти сразу!
    return [r["id"] for r in stream if r["valid"]]`,
      fixHint: 'Замените квадратные скобки [] на круглые (), чтобы вернуть генератор вместо списка.',
      solutionCode: `def process_records(stream):
    return (r["id"] for r in stream if r["valid"])`,
      testConfig: {
        checkOrder: false,
        floatPrecision: 2,
      },
    },
    hints: [
      'Используйте стандартный цикл for tx in transactions: для обхода входящих данных.',
      'Проверяйте условие tx.get("status") == "SUCCESS" and tx.get("amount", 0) >= min_amount.',
      'Возвращайте элемент через yield (tx["id"], round(tx["amount"], 2)). Никаких списков и append!',
    ],
  },
  {
    id: 'python-6',
    moduleSlug: 'python',
    order: 6,
    title: 'Надежные сетевые коннекторы: Пагинация, UTC и Exponential Backoff',
    estimatedMinutes: 35,
    glossaryTerms: [
      { term: 'Exponential Backoff', definition: 'Алгоритм повтора запросов, при котором время ожидания экспоненциально увеличивается с каждой неудачной попыткой (1с, 2с, 4с, 8с).' },
      { term: 'Jitter', definition: 'Случайный разброс времени задержки, предотвращающий одновременный штурм API миллионом клиентов (Thundering Herd).' },
      { term: 'Rate Limiting', definition: 'Ограничение количества сетевых запросов в единицу времени со стороны стороннего API (код ответа 429).' },
    ],
    schemaPreview: [
      {
        tableName: 'api_ingestion_log',
        description: 'Журнал обращений к внешнему REST API платежного шлюза',
        columns: [
          { name: 'attempt_num', type: 'INT' },
          { name: 'endpoint', type: 'VARCHAR(255)' },
          { name: 'response_code', type: 'INT' },
          { name: 'delay_sec', type: 'FLOAT' },
          { name: 'created_at_utc', type: 'TIMESTAMP' },
        ],
        sampleRows: [
          { attempt_num: 1, endpoint: '/v1/payouts', response_code: 429, delay_sec: 1.25, created_at_utc: '2026-10-31 15:00:00' },
          { attempt_num: 2, endpoint: '/v1/payouts', response_code: 503, delay_sec: 2.45, created_at_utc: '2026-10-31 15:00:02' },
          { attempt_num: 3, endpoint: '/v1/payouts', response_code: 200, delay_sec: 0.00, created_at_utc: '2026-10-31 15:00:06' },
        ],
      },
    ],
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Сеть не надежна: почему простые скрипты падают в боевых условиях

В учебных курсах обращение к API выглядит как три строки:
\`\`\`python
# ❌ НАИВНЫЙ КОД — 100% ПАДЕНИЕ В ПРОДЕ
response = requests.get("https://api.crm.com/users")
data = response.json()
\`\`\`

В реальной эксплуатации этот код неизбежно приведет к аварии по одной из следующих причин:
1. **Отсутствие таймаута:** Если внешний сервер завис или произошел сетевой дроп пакетов, \`requests\` без аргумента \`timeout\` будет **висеть бесконечно (днями!)**, удерживая соединение и блокируя весь ETL-пайплайн.
2. **Лимиты частоты запросов (Rate Limits / 429 Too Many Requests):** Внешний API разрешает, например, не более 10 запросов в секунду. Ваш скрипт шлет 100 запросов и мгновенно блокируется шлюзом.
3. **Временные сетевые сбои (503 Service Unavailable / 502 Bad Gateway / ConnectionReset):** Сеть в облаке флапает. Без механизма повторных попыток (Retries) пайплайн упадет в самом конце суточной загрузки.

#### Алгоритм Exponential Backoff с Full Jitter
Стандарт надежности распределенных систем (рекомендованный AWS и Google Cloud):

1. **Экспоненциальный рост паузы:** Задержка перед следующей попыткой растет как \`base_delay * (2 ** attempt)\`.
   * Попытка 1: 1 сек
   * Попытка 2: 2 сек
   * Попытка 3: 4 сек
   * Попытка 4: 8 сек
2. **Добавление случайного разброса (Full Jitter):**
   Если 100 воркеров упали одновременно, без джиттера все 100 воркеров проснутся ровно через 2 секунды и снова обрушат восстанавливающийся сервер (проблема **Thundering Herd** / «Громовое стадо»).
   Джиттер размазывает пробуждение: \`delay = random.uniform(0, base_delay * (2 ** attempt))\`.

#### Правило дат и времени для Data Engineer: Strict UTC
* **Никогда** не храните и не обрабатывайте в пайплайнах «наивные» (naive) даты без таймзоны.
* **Никогда** не используйте устаревший \`datetime.utcnow()\` (он возвращает naive объект).
* **Единый закон хранилища:** Все входящие данные немедленно приводятся к **UTC timezone-aware** объектам через \`datetime.now(timezone.utc)\` или \`ZoneInfo\`. Локальные таймзоны применяются строго в самом конце — на уровне формирования отчета для клиента.`,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Дверь в кабинет врача',
        content: `Представьте, что вы подошли к кабинету врача, дернули ручку — закрыто (ошибка 503).
        
Наивный подход: долбить ручку двери 50 раз в секунду без перерыва. Вас выставит охрана за хулиганство (ошибка 429).
        
Exponential Backoff с Jitter: вы понимаете, что врач занят. Вы отходите на скамейку, ждете 1 минуту. Подошли — все еще занято. Вы ждете уже 2-3 минуты. В третий раз ждете 4-7 минут. Врач освобождается, и вы спокойно заходите без скандала.`,
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Перевод стрелок часов на летнее/зимнее время',
        content: `Если в хранилище сохраняются даты с локальной таймзоной (например, \`Europe/Berlin\`), осенью при переводе стрелок на 1 час назад в базе образуется **дублирующий час с 02:00 до 03:00**.
        
Транзакции за два разных физических момента времени получат абсолютно одинаковые метки времени! Ломаются финансовые балансы, оконные функции и последовательность событий.
        
**Лечение:** Внутри пайплайнов — строго монотонное время **UTC**.`,
      },
      {
        type: 'callout',
        variant: 'interview',
        title: '🎯 Спросят на собесе: Зачем указывать оба таймаута: connect timeout и read timeout?',
        content: `Библиотека requests позволяет передавать таймаут кортежем: \`timeout=(3.05, 27)\`.
- **Connect Timeout (3.05 сек):** максимальное время на установление TCP-соединения (handshake) с удаленным сервером. Должен быть чуть больше 3 секунд (стандартный интервал повтора TCP SYN).
- **Read Timeout (27 сек):** максимальное время ожидания первого байта ответа после того, как соединение установлено и запрос отправлен. Защищает от серверов, которые приняли запрос, но зависли на генерации тяжелого SQL-отчета.`,
      },
    ],
    taskDescription: `Реализуйте функцию 'calculate_backoff_delay(attempt, base_delay, max_delay)', которая вычисляет задержку в секундах для заданной попытки (attempt: 0, 1, 2...) по формуле экспоненциального отката: min(max_delay, base_delay * (2 ** attempt)). Функция должна возвращать вещественное число с округлением до 2 знаков после запятой.`,
    seedCode: `# Параметры тестирования
test_cases = [
    (0, 1.0, 30.0),
    (1, 1.0, 30.0),
    (2, 1.0, 30.0),
    (5, 1.0, 30.0),
    (10, 1.0, 30.0),
]`,
    initialCode: `def calculate_backoff_delay(attempt: int, base_delay: float = 1.0, max_delay: float = 30.0) -> float:
    """
    Вычисляет экспоненциальную задержку: min(max_delay, base_delay * (2 ** attempt)).
    """
    # Ваш код здесь
    pass`,
    solutionCode: `def calculate_backoff_delay(attempt: int, base_delay: float = 1.0, max_delay: float = 30.0) -> float:
    calculated = base_delay * (2 ** attempt)
    return round(min(max_delay, float(calculated)), 2)`,
    testConfig: {
      checkOrder: true,
      floatPrecision: 2,
    },
    brokenProdTask: {
      title: 'Инцидент #109: Наивный datetime.now() сломал расчет задержки в Airflow',
      incidentDescription: 'В коде коннектора вычитались naive datetime и aware datetime в UTC, что вызвало падение: TypeError: can\'t subtract offset-naive and offset-aware datetimes.',
      buggyCode: `from datetime import datetime

def is_event_stale(event_utc_time):
    # Падение: datetime.now() возвращает naive время!
    return (datetime.now() - event_utc_time).total_seconds() > 3600`,
      fixHint: 'Используйте datetime.now(timezone.utc) для создания timezone-aware объекта текущего времени.',
      solutionCode: `from datetime import datetime, timezone

def is_event_stale(event_utc_time):
    return (datetime.now(timezone.utc) - event_utc_time).total_seconds() > 3600`,
      testConfig: {
        checkOrder: false,
        floatPrecision: 2,
      },
    },
    hints: [
      'Формула экспоненты в Python: base_delay * (2 ** attempt).',
      'Используйте функцию min(max_delay, ...), чтобы ограничить рост задержки.',
      'Округлите итоговый результат через round(..., 2).',
    ],
  },
{
  "id": "python-7",
  "moduleSlug": "python",
  "order": 7,
  "title": "Контракты данных (Data Contracts), валидация схем и паттерн Dead Letter Queue (DLQ)",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "Data Contract",
      "definition": "Формальное соглашение между поставщиком данных (Backend/API) и хранилищем (DWH) о структуре, типах и бизнес-ограничениях событий."
    },
    {
      "term": "Dead Letter Queue (DLQ)",
      "definition": "Карантинное хранилище (отдельная таблица или топик Kafka), куда сбрасываются битые записи вместе с причиной ошибки, чтобы не ронять весь пайплайн."
    },
    {
      "term": "Schema Drift",
      "definition": "Несогласованное изменение схемы данных в источнике (например, переименование поля или смена int на string), ломающее парсеры."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "raw_payment_webhooks",
      "description": "Входящий поток сырых JSON-событий от платежного шлюза",
      "columns": [
        {
          "name": "event_id",
          "type": "STRING"
        },
        {
          "name": "amount",
          "type": "ANY (FLOAT / STRING / NULL)"
        },
        {
          "name": "currency",
          "type": "STRING"
        }
      ],
      "sampleRows": [
        {
          "event_id": "evt_101",
          "amount": 1500.5,
          "currency": "RUB"
        },
        {
          "event_id": "evt_102",
          "amount": "broken_val",
          "currency": "RUB"
        },
        {
          "event_id": "evt_103",
          "amount": -50.0,
          "currency": "USD"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Почему пайплайны падают в 3 часа ночи: Проблема грязных данных\n\nГлавная ошибка начинающего дата-инженера — доверять внешним источникам (REST API, вебхукам, логам фронтенда). В реальном продакшене бэкенд-разработчики могут без предупреждения поменять тип поля `amount` с числа `1500` на строку `\"1500.00 RUB\"` или прислать `null` в обязательном ключе. Это называется **Schema Drift (дрейф схемы)**.\n\nЕсли ваш ETL-скрипт наивно конвертирует данные в лоб:\n```python\n# ❌ ХРУПКИЙ ПАЙПЛАЙН: одна битая запись из 10 миллионов обрушит всю джобу!\ndef process_batch(events: list[dict]):\n    return [float(e[\"amount\"]) for e in events]  # Упадет с ValueError или KeyError!\n```\nКогда на 999 999-й записи прилетает битый JSON, скрипт падает с необработанным исключением. Ночной батч сорван, утренние дашборды пустые.\n\n#### Инженерный стандарт: Валидация + Паттерн Dead Letter Queue (DLQ)\nВ промышленной разработке (с использованием **Pydantic**, `dataclasses` или кастомных валидаторов) ни один батч не должен падать целиком из-за единичного мусора.\n\nПрименяется паттерн **маршрутизации в карантин (Dead Letter Queue / Quarantine Table)**:\n1. Каждая запись проходит строгую проверку контракта (наличие ключей, приведение типов, бизнес-правила вроде `amount > 0`).\n2. **Валидные записи** идут в основную витрину (`clean_records`).\n3. **Битые записи** не игнорируются молча и не роняют скрипт, а упаковываются вместе с текстом ошибки и сырым пейлоадом в очередь `dlq_records`. После завершения батча срабатывает алерт, а инженеры разбирают карантин без остановки бизнеса."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Фейс-контроль и комната досмотра в аэропорту",
      "content": "Хрупкий пайплайн без DLQ работает так: если у одного пассажира из 500 человек в очереди просрочен паспорт, аэропорт закрывают целиком и отменяют все рейсы.\n\nПаттерн DLQ (Dead Letter Queue) — это работа таможни: пассажиры с валидными документами спокойно проходят на посадку (в DWH), а проблемного пассажира аккуратно отводят в отдельную комнату разбора (таблица карантина), фиксируя причину задержания. Самолет улетает вовремя!"
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Молчаливый try...except: pass",
      "content": "Худшее, что можно сделать вместо падения — написать `try: ... except Exception: pass`. В таком случае при изменении формата API ваш пайплайн в Airflow будет гореть «зеленым» (Success), но в хранилище тихо перестанут поступать 40% транзакций. Финансовый директор заметит пропажу выручки только в конце квартала. Всегда сохраняйте отброшенные строки в DLQ и ставьте метрику: если доля ошибок в батче выше 5%, поднимать тревогу!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Как организовать обработку битых записей в потоковом или батчевом ETL?",
      "content": "Опишите трехступенчатую защиту:\n1) Декларативный контракт на входе (Pydantic / JSON Schema), проверяющий типы и границы значений.\n2) Разделение потока (Split Stream) на `valid` и `invalid (DLQ)` с сохранением сырого JSON и стектрейса ошибки.\n3) Circuit Breaker: если процент брака превышает порог (например, более 10% батча ушло в DLQ — значит сломался сам источник), джоба принудительно останавливается, чтобы не засорить карантин миллионами строк."
    }
  ],
  "taskDescription": "Реализуйте функцию валидации потока платежей 'validate_payments_batch(records)', которая принимает список словарей.\nЗапись считается валидной, если:\n1) В ней присутствуют ключи 'id' (непустая строка) и 'amount'.\n2) Значение 'amount' можно конвертировать в float, и оно строго больше 0.\n\nФункция должна вернуть кортеж из двух списков: (valid_records, dlq_records).\n- В 'valid_records' добавляются словари вида {'id': str, 'amount': round(float(amount), 2)}.\n- В 'dlq_records' добавляются исходные словари невалидных записей без изменений.",
  "seedCode": "raw_batch = [\n    {\"id\": \"tx_1\", \"amount\": \"120.555\"},\n    {\"id\": \"tx_2\", \"amount\": -10},\n    {\"id\": \"tx_3\", \"amount\": \"broken\"},\n    {\"id\": \"\", \"amount\": 500},\n    {\"id\": \"tx_4\", \"amount\": 99.9}\n]",
  "initialCode": "def validate_payments_batch(records: list[dict]) -> tuple[list[dict], list[dict]]:\n    valid_records = []\n    dlq_records = []\n    # Реализуйте маршрутизацию валидных записей и карантина (DLQ)\n    \n    return valid_records, dlq_records",
  "solutionCode": "def validate_payments_batch(records: list[dict]) -> tuple[list[dict], list[dict]]:\n    valid_records = []\n    dlq_records = []\n    for rec in records:\n        tx_id = rec.get(\"id\")\n        raw_amount = rec.get(\"amount\")\n        if not isinstance(tx_id, str) or not tx_id.strip() or raw_amount is None or isinstance(raw_amount, bool):\n            dlq_records.append(rec)\n            continue\n        try:\n            amt = float(raw_amount)\n            if amt <= 0:\n                dlq_records.append(rec)\n            else:\n                valid_records.append({\"id\": tx_id, \"amount\": round(amt, 2)})\n        except (ValueError, TypeError):\n            dlq_records.append(rec)\n    return valid_records, dlq_records",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 2
  },
  "brokenProdTask": {
    "title": "Инцидент #210: Пропажа нулевых скидок из-за проверки if not record.get(\"discount\")",
    "incidentDescription": "Разработчик написал проверку обязательного поля discount через if not rec.get(\"discount\"). В Python число 0.0 является Falsy-значением! В результате все заказы с нулевой скидкой (0.0) были ошибочно отправлены в карантин DLQ как невалидные.",
    "buggyCode": "def filter_valid_discounts(orders: list[dict]) -> list[dict]:\n    # БАГ: 0 и 0.0 вычисляются как False при проверке if not!\n    return [o for o in orders if o.get(\"discount\") and o[\"discount\"] >= 0]",
    "fixHint": "Проверяйте наличие значения явно через is not None, чтобы не отбрасывать валидный ноль (0.0).",
    "solutionCode": "def filter_valid_discounts(orders: list[dict]) -> list[dict]:\n    return [o for o in orders if o.get(\"discount\") is not None and o[\"discount\"] >= 0]",
    "testConfig": {
      "checkOrder": true,
      "floatPrecision": 2
    }
  },
  "hints": [
    "Проверьте, что rec.get(\"id\") является строкой и после .strip() не пуст.",
    "Оберните float(rec.get(\"amount\")) в блок try...except (ValueError, TypeError).",
    "Не забудьте проверить условие amt > 0 и округлить сумму через round(amt, 2)."
  ]
},
{
  "id": "python-8",
  "moduleSlug": "python",
  "order": 8,
  "title": "Пакетная вставка (Batching / Chunking) и управление транзакциями при загрузке в БД",
  "estimatedMinutes": 30,
  "glossaryTerms": [
    {
      "term": "Chunking (Batching)",
      "definition": "Разбиение бесконечного или огромного потока данных на пакеты фиксированного размера (например, по 5 000 строк) для эффективной сетевой отправки."
    },
    {
      "term": "Network Round-Trip (RTT)",
      "definition": "Накладные расходы времени на пересылку пакета по сети от Python-воркера до сервера СУБД и получение подтверждения."
    },
    {
      "term": "executemany / execute_values",
      "definition": "Методы драйвера БД (например, psycopg2), упаковывающие тысячи строк в один SQL-запрос INSERT вместо тысяч одиночных запросов."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "batch_benchmark",
      "description": "Сравнение скорости вставки 100 000 строк в PostgreSQL",
      "columns": [
        {
          "name": "method",
          "type": "STRING"
        },
        {
          "name": "batch_size",
          "type": "INTEGER"
        },
        {
          "name": "execution_time_sec",
          "type": "FLOAT"
        }
      ],
      "sampleRows": [
        {
          "method": "Single INSERT in loop",
          "batch_size": 1,
          "execution_time_sec": 142.5
        },
        {
          "method": "Batched INSERT (Chunked)",
          "batch_size": 5000,
          "execution_time_sec": 1.8
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Проблема N+1 сетевых походов в базу и взрыв транзакционного лога\n\nПредставьте, что вы прочитали поток из **100 000 заказов** через генератор (память в безопасности!). Но затем внутри цикла написали:\n```python\n# ❌ СМЕРТЬ ПРОИЗВОДИТЕЛЬНОСТИ: 100 000 отдельных сетевых запросов и коммитов\nfor row in stream:\n    cursor.execute(\"INSERT INTO orders VALUES (%s, %s)\", row)\n    conn.commit()\n```\nДаже если пинг до базы данных составляет всего **1.5 мс**, умножьте это на 100 000 итераций: вы потратите **150 секунд чистого ожидания сети (Network RTT)**! Более того, каждый `commit()` заставляет СУБД сбрасывать буфер транзакционного журнала (WAL) на физический диск (`fsync`), создавая колоссальную нагрузку на IOPS.\n\nНо и другая крайность опасна: нельзя копить все 10 миллионов строк в один список, чтобы вставить их одним гигантским запросом — воркер упадет по OOM, либо СУБД оборвет соединение по `max_allowed_packet` / `statement_timeout`.\n\n#### Золотой стандарт: Генератор чанков (Chunking Generator)\nДата-инженер всегда передает данные в БД **пакетами (батчами / чанками)** по `1 000 – 10 000` записей:\n```python\nfrom itertools import islice\n\ndef chunked_iterable(iterable, chunk_size: int):\n    iterator = iter(iterable)\n    while True:\n        chunk = list(islice(iterator, chunk_size))\n        if not chunk:\n            break\n        yield chunk\n```\nТакой подход сочетает константное потребление памяти и сокращает число сетевых запросов в тысячи раз!"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Переезд на ложке против грузовика",
      "content": "Вставка по одной строке в цикле — это попытка перевезти кирпичи на стройку, нося по одному кирпичу в руках через весь город.\nПопытка вставить 100 млн строк разом — это погрузить весь кирпичный завод на один грузовик: у него лопнут оси (OOM).\nПаттерн Chunking — это загружать в кузов ровно по 1000 кирпичей и делать 10 быстрых рейсов."
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Потеря последнего неполного батча",
      "content": "Когда инженеры пишут батчинг вручную через счетчик и буфер `batch.append(row)` внутри цикла `if len(batch) == batch_size: yield batch`, они часто забывают сделать финальный `if batch: yield batch` ПОСЛЕ выхода из цикла `for`!\nВ результате при загрузке 10 500 строк первые 10 000 (два полных батча по 5000) уходят в базу, а оставшиеся 500 строк в хвосте бесследно пропадают при завершении функции!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Какой метод psycopg2 самый быстрый для вставки батча в PostgreSQL?",
      "content": "Стандартный `cursor.executemany()` в psycopg2 медленный, так как под капотом все равно выполняет отдельные `INSERT` в цикле. Для настоящей пакетной вставки используют `psycopg2.extras.execute_values()` (собирает один многострочный `VALUES (...), (...)`) или протокол потокового копирования `cursor.copy_expert(\"COPY table FROM STDIN\", buffer)`, который пишет данные напрямую в файлы таблиц в обход парсера запросов."
    }
  ],
  "taskDescription": "Реализуйте функцию-генератор 'batch_stream(iterable, batch_size)', которая принимает любой итерируемый объект (список или генератор) и размер пакета 'batch_size' (int > 0).\nФункция должна лениво через 'yield' возвращать списки (батчи) длиной 'batch_size', а в самом конце — остаточный хвост (если количество элементов не делится нацело).",
  "seedCode": "sample_events = [\"evt_1\", \"evt_2\", \"evt_3\", \"evt_4\", \"evt_5\", \"evt_6\", \"evt_7\"]",
  "initialCode": "def batch_stream(iterable, batch_size: int):\n    # Реализуйте генератор батчей без потери остаточного хвоста\n    pass",
  "solutionCode": "def batch_stream(iterable, batch_size: int):\n    batch = []\n    for item in iterable:\n        batch.append(item)\n        if len(batch) == batch_size:\n            yield batch\n            batch = []\n    if batch:\n        yield batch",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 2,
    "requiredAstPatterns": [
      "Yield"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #214: Ежедневная пропажа хвоста транзакций при загрузке в ClickHouse",
    "incidentDescription": "Батчер отправлял пачки ровно по 3 записи, но забывал отдать неполный буфер после завершения цикла for. Из-за этого из 7 записей в базу попадали только 6.",
    "buggyCode": "def make_batches(items: list, size: int) -> list[list]:\n    res, current = [], []\n    for x in items:\n        current.append(x)\n        if len(current) == size:\n            res.append(current)\n            current = []\n    # БАГ: если в current остался хвост < size, он теряется!\n    return res",
    "fixHint": "После окончания цикла for проверьте if current: и добавьте остаток в результирующий список res.",
    "solutionCode": "def make_batches(items: list, size: int) -> list[list]:\n    res, current = [], []\n    for x in items:\n        current.append(x)\n        if len(current) == size:\n            res.append(current)\n            current = []\n    if current:\n        res.append(current)\n    return res",
    "testConfig": {
      "checkOrder": true,
      "floatPrecision": 2
    }
  },
  "hints": [
    "Создайте пустой список batch = [] перед циклом for item in iterable.",
    "Когда len(batch) == batch_size, отдайте его через yield batch и обнулите batch = [].",
    "Обязательно добавьте проверку if batch: yield batch после завершения цикла for!"
  ]
},
{
  "id": "python-9",
  "moduleSlug": "python",
  "order": 9,
  "title": "Идемпотентность, дедупликация в памяти и криптографическое хэширование (SHA-256)",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "Idempotency (Идемпотентность)",
      "definition": "Свойство операции приводить к одному и тому же результату при однократном или многократном повторном выполнении."
    },
    {
      "term": "Deterministic Hash Key",
      "definition": "Суррогатный ключ, вычисляемый по алгоритму SHA-256 или MD5 от бизнес-ключа, всегда дающий одинаковый результат для одних и тех же входных данных."
    },
    {
      "term": "Hash Collision",
      "definition": "Ситуация, когда два разных входных набора данных дают одинаковый хэш (для SHA-256 вероятность практически равна нулю)."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "stg_customer_hash",
      "description": "Формирование суррогатного ключа и HashDiff для Data Vault / DWH",
      "columns": [
        {
          "name": "business_key",
          "type": "STRING"
        },
        {
          "name": "normalized_str",
          "type": "STRING"
        },
        {
          "name": "sha256_hk",
          "type": "STRING (64 hex chars)"
        }
      ],
      "sampleRows": [
        {
          "business_key": " usr_42 ",
          "normalized_str": "USR_42",
          "sha256_hk": "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Почему встроенный hash() в Python ломает хранилища данных\n\nВ архитектурах DWH (особенно **Data Vault 2.0** и инкрементальных пайплайнах) вместо автоинкрементных `SERIAL / IDENTITY` ключей используются **детерминированные хэш-ключи**. Это позволяет параллельно загружать таблицы на десятках нод без координации последовательности ID и легко отслеживать изменения атрибутов строки (через `HashDiff`).\n\nНачинающие разработчики часто пытаются использовать встроенную функцию Python `hash()`:\n```python\n# ❌ КАТАСТРОФА: Встроенный hash() в Python НЕ детерминирован между перезапусками!\nuser_hk = hash(\"user_101\")\n```\nНачиная с Python 3.3, для защиты от DoS-атак по коллизиям хэш-таблиц в интерпретаторе по умолчанию включена рандомизация зерна (**PYTHONHASHSEED**). При каждом новом запуске воркера Airflow функция `hash(\"user_101\")` будет возвращать **абсолютно разные числа**! Ваше хранилище мгновенно разъедется.\n\n#### Инженерный стандарт: `hashlib.sha256` и каноническая нормализация\nДля генерации суррогатных ключей и проверки дубликатов используется стандартная библиотека `hashlib`:\n1. **Нормализация:** каждое поле приводится к строке, очищается от краевых пробелов (`.strip()`), переводится в единый регистр (`.upper()`), а `None` заменяется на спецсимвол.\n2. **Разделитель:** поля склеиваются через явный разделитель (например, `\"||\"`), чтобы пары `(\"AB\", \"C\")` и `(\"A\", \"BC\")` не дали одинаковую строку `\"ABC\"`!\n3. **Кодирование в UTF-8 и SHA-256:** `hashlib.sha256(payload.encode('utf-8')).hexdigest()`."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Отпечаток пальца против номерка в гардеробе",
      "content": "Автоинкрементный ID (`1, 2, 3...`) или рандомный `hash()` — это бумажный номерок в гардеробе: сегодня вам дали №15, а завтра в другом театре дадут №84. По номерку нельзя узнать человека.\nДетерминированный `SHA-256` от бизнес-ключа — это биометрический отпечаток пальца: в какой бы точке мира и на каком бы сервере вы ни приложили палец к сканеру, код всегда совпадет на 100%."
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Коллизия склейки без разделителя",
      "content": "Если вы считаете хэш составного ключа простой конкатенацией `f\"{first_name}{last_name}\"`, то два разных человека — `(\"Иван\", \"Осадчий\")` и `(\"Ивано\", \"Садчий\")` — превратятся в одну и ту же строку `\"ИванОсадчий\"` и получат идентичный SHA-256 хэш! В результате транзакции одного клиента перезапишут другого. Всегда разделяйте колонки разделителем `||`, а `NULL` кодируйте отдельно от пустой строки."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Зачем в Python рандомизируется встроенный hash() и чем он отличается от hashlib?",
      "content": "Встроенный `hash()` создан для быстрой работы словарей `dict` и множеств `set` внутри одного процесса в RAM и использует случайную соль `PYTHONHASHSEED` при старте процесса для защиты веб-серверов от Hash-DoS атак. Модуль `hashlib` (MD5, SHA-256) реализует криптографические стандарты, которые гарантируют одинаковый хэш на любой ОС, любой версии Python и в любой стране мира."
    }
  ],
  "taskDescription": "Реализуйте функцию 'generate_surrogate_key(fields: list)', которая вычисляет детерминированный SHA-256 хэш для списка атрибутов записи:\n1. Каждый элемент списка преобразуйте в строку (если элемент равен None, замените его на строку '<NULL>'), удалите пробелы по краям (.strip()) и приведите к верхнему регистру (.upper()).\n2. Соедините нормализованные элементы через разделитель '||'.\n3. Верните hex-строку SHA-256 хэша (в нижнем регистре) от полученной строки в кодировке utf-8.",
  "seedCode": "sample_row = [\" usr_105 \", \"Moscow \", None]",
  "initialCode": "import hashlib\n\ndef generate_surrogate_key(fields: list) -> str:\n    # Нормализуйте поля, соедините через '||' и верните sha256 hexdigest\n    pass",
  "solutionCode": "import hashlib\n\ndef generate_surrogate_key(fields: list) -> str:\n    normalized = []\n    for f in fields:\n        if f is None:\n            normalized.append(\"<NULL>\")\n        else:\n            normalized.append(str(f).strip().upper())\n    payload = \"||\".join(normalized)\n    return hashlib.sha256(payload.encode(\"utf-8\")).hexdigest()",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 2
  },
  "brokenProdTask": {
    "title": "Инцидент #219: Схлопывание разных артикулов из-за склейки без разделителя",
    "incidentDescription": "При генерации хэш-ключа склада поля category_id и item_id склеивались без разделителя. Из-за этого (category=\"12\", item=\"3\") и (category=\"1\", item=\"23\") давали одинаковую строку \"123\" и одинаковый хэш, перезаписывая остатки товара!",
    "buggyCode": "import hashlib\n\ndef make_item_hk(category_id: str, item_id: str) -> str:\n    # БАГ: склейка без разделителя вызывает коллизию \"12\"+\"3\" == \"1\"+\"23\"\n    raw = f\"{category_id.strip()}{item_id.strip()}\"\n    return hashlib.sha256(raw.encode(\"utf-8\")).hexdigest()",
    "fixHint": "Добавьте разделитель \"||\" между category_id.strip() и item_id.strip() при формировании строки.",
    "solutionCode": "import hashlib\n\ndef make_item_hk(category_id: str, item_id: str) -> str:\n    raw = f\"{category_id.strip()}||{item_id.strip()}\"\n    return hashlib.sha256(raw.encode(\"utf-8\")).hexdigest()",
    "testConfig": {
      "checkOrder": true,
      "floatPrecision": 2
    }
  },
  "hints": [
    "Для каждого элемента проверьте: if f is None: используйте \"<NULL>\", иначе str(f).strip().upper().",
    "Склейте список строк через \"||\".join(normalized).",
    "Вызовите hashlib.sha256(payload.encode(\"utf-8\")).hexdigest()."
  ]
},
{
  "id": "python-10",
  "moduleSlug": "python",
  "order": 10,
  "title": "Контекстные менеджеры (with), управление ресурсами и транзакционная безопасность",
  "estimatedMinutes": 30,
  "glossaryTerms": [
    {
      "term": "Context Manager",
      "definition": "Объект Python, определяющий методы __enter__() и __exit__(), который гарантирует корректное освобождение ресурсов (закрытие сокетов, файлов, транзакций) даже при падении кода."
    },
    {
      "term": "Connection Pool Exhaustion",
      "definition": "Исчерпание лимита открытых соединений к СУБД (например, max_connections=100 в PostgreSQL) из-за незакрытых сессий при ошибках."
    },
    {
      "term": "Atomicity (Атомарность)",
      "definition": "Принцип ACID: транзакция либо фиксируется целиком (COMMIT), либо полностью откатывается (ROLLBACK) при любой ошибке."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "pg_stat_activity",
      "description": "Мониторинг зависших соединений в PostgreSQL при утечке ресурсов",
      "columns": [
        {
          "name": "pid",
          "type": "INTEGER"
        },
        {
          "name": "state",
          "type": "STRING"
        },
        {
          "name": "query",
          "type": "STRING"
        }
      ],
      "sampleRows": [
        {
          "pid": 14021,
          "state": "idle in transaction",
          "query": "UPDATE accounts SET balance = balance - 100;"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Как забытый .close() или .rollback() кладет базу данных\n\nВ продакшене сетевые сбои и ошибки в данных происходят постоянно. Посмотрите на классический антипаттерн работы с БД:\n```python\n# ❌ УТЕЧКА СОЕДИНЕНИЙ И ЗАВИСШАЯ ТРАНЗАКЦИЯ\nconn = db.connect()\ncursor = conn.cursor()\ncursor.execute(\"UPDATE inventory SET stock = stock - 1 WHERE id = 10\")\n# Если на следующей строчке вылетит ошибка деления на ноль или KeyError...\ncalc_metrics()  # <-- БАХ! Исключение!\nconn.commit()\nconn.close()    # <-- Управление сюда НИКОГДА не дойдет!\n```\nЕсли внутри блока происходит ошибка, строки `commit()` и `close()` не выполняются. Что происходит с базой?\n1. Сессия в PostgreSQL переходит в статус **`idle in transaction`**.\n2. Строка `id = 10` в таблице `inventory` остается **заблокированной (Row-level Lock)**! Все остальные пайплайны и пользователи сайта встают в бесконечную очередь ожидания.\n3. Через 15 таких падений пул соединений исчерпывается (`FATAL: sorry, too many clients already`), и ложится весь проект.\n\n#### Протокол Контекстного Менеджера (`__enter__` / `__exit__`) и `contextlib`\nКонструкция `with` гарантирует выполнение завершающего кода в методе `__exit__(exc_type, exc_val, exc_tb)` при любом исходе:\n- Если блок прошел без ошибок (`exc_type is None`) — выполняется `commit()`.\n- Если внутри вылетело исключение (`exc_type is not None`) — автоматически вызывается `rollback()`, снимающий все блокировки.\n- В блоке `finally` соединение гарантированно закрывается или возвращается в пул!"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Дверь с доводчиком против обычной двери",
      "content": "Обычный вызов `conn.close()` — это табличка «Уходя, закрывайте дверь». Если в здании случился пожар (Exception), все выбегают в панике, и дверь остается настежь.\nКонтекстный менеджер `with` — это мощный гидравлический доводчик на двери: что бы ни случилось внутри комнаты, как только человек её покинул (штатно или через окно), стальная пружина сама захлопнет дверь и закроет замок."
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Особенность with conn: в драйвере psycopg2",
      "content": "Мало кто знает, но в популярном драйвере PostgreSQL `psycopg2` конструкция `with conn:` управляет ТОЛЬКО транзакцией (делает `commit` или `rollback`), но **НЕ закрывает само физическое соединение**! Чтобы закрыть и соединение, нужно либо использовать `contextlib.closing(conn)`, либо явно вызывать `conn.close()` в блоке `finally`. Об этом обожглись тысячи дата-инженеров на собеседованиях и в продакшене!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Что произойдет, если метод __exit__ контекстного менеджера вернет True?",
      "content": "Если внутри блока `with` произошло исключение, Python передает его тип и значение в `__exit__(exc_type, exc_val, exc_tb)`. Если `__exit__` возвращает `True`, Python считает исключение **подавленным (проглоченным)** и продолжает выполнение кода дальше без падения! В ETL-транзакциях `__exit__` обязан сделать `rollback()`, закрыть ресурсы и вернуть `False` (или `None`), чтобы ошибка пробросилась наверх в Airflow и пометила таску как Failed."
    }
  ],
  "taskDescription": "Реализуйте безопасный транзакционный раннер 'run_in_transaction(conn, operations)', где:\n- 'conn' — объект мок-соединения, у которого есть методы conn.execute(sql), conn.commit(), conn.rollback() и conn.close().\n- 'operations' — список SQL-строк для выполнения.\nФункция должна выполнить все запросы по очереди. Если все прошли успешно — вызвать conn.commit() и вернуть True. Если на любом запросе возникло исключение — вызвать conn.rollback() и повторно выбросить (raise) это исключение! Вне зависимости от успеха или ошибки соединение обязано быть закрыто вызовом conn.close().",
  "seedCode": "class MockConn:\n    def __init__(self):\n        self.log = []\n    def execute(self, q):\n        if \"FAIL\" in q: raise RuntimeError(\"DB Error\")\n        self.log.append(f\"EXEC:{q}\")\n    def commit(self): self.log.append(\"COMMIT\")\n    def rollback(self): self.log.append(\"ROLLBACK\")\n    def close(self): self.log.append(\"CLOSE\")",
  "initialCode": "def run_in_transaction(conn, operations: list[str]) -> bool:\n    # Обеспечьте атомарность (commit/rollback) и гарантированный close()\n    pass",
  "solutionCode": "def run_in_transaction(conn, operations: list[str]) -> bool:\n    try:\n        for sql in operations:\n            conn.execute(sql)\n        conn.commit()\n        return True\n    except Exception:\n        conn.rollback()\n        raise\n    finally:\n        conn.close()",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 2
  },
  "brokenProdTask": {
    "title": "Инцидент #224: Замалчивание ошибки в __exit__ оставило DAG в статусе Success при пустой витрине",
    "incidentDescription": "Разработчик написал контекстный менеджер для транзакций БД и в методе __exit__ вернул True. Когда запрос упал по ошибке деления на ноль, откат rollback() сработал, но из-за return True исключение было проглочено, и Airflow отчитался об успешной загрузке!",
    "buggyCode": "class TransactionManager:\n    def __init__(self, conn): self.conn = conn\n    def __enter__(self): return self.conn\n    def __exit__(self, exc_type, exc_val, exc_tb):\n        if exc_type is not None:\n            self.conn.rollback()\n            return True  # БАГ: Подавляет ошибку! Пайплайн думает, что всё ОК!\n        self.conn.commit()\n        return False",
    "fixHint": "Измените возвращаемое значение при ошибке на False, чтобы исключение пробрасывалось наружу после rollback().",
    "solutionCode": "class TransactionManager:\n    def __init__(self, conn): self.conn = conn\n    def __enter__(self): return self.conn\n    def __exit__(self, exc_type, exc_val, exc_tb):\n        if exc_type is not None:\n            self.conn.rollback()\n            return False\n        self.conn.commit()\n        return False",
    "testConfig": {
      "checkOrder": true,
      "floatPrecision": 2
    }
  },
  "hints": [
    "Используйте конструкцию try ... except Exception: ... finally: ...",
    "В блоке except вызовите conn.rollback(), а затем напишите пустой оператор raise для проброса ошибки.",
    "В блоке finally вызовите conn.close() — он выполнится в любом случае."
  ]
},
{
  "id": "python-11",
  "moduleSlug": "python",
  "order": 11,
  "title": "Конкурентность в Data Engineering: GIL, I/O-bound против CPU-bound и лимиты пулов",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "GIL (Global Interpreter Lock)",
      "definition": "Глобальная блокировка интерпретатора CPython, позволяющая исполнять байткод Python только одному потоку (thread) в один момент времени."
    },
    {
      "term": "I/O-Bound Task",
      "definition": "Задача, ограниченная скоростью сети или диска (ожидание ответа от REST API, S3 или БД), где процессор простаивает 99% времени."
    },
    {
      "term": "Semaphore / Rate Limiter",
      "definition": "Примитив синхронизации, ограничивающий количество одновременно выполняющихся сетевых запросов (например, не более 10 параллельных соединений)."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "concurrency_models",
      "description": "Выбор модели параллелизма в Python для задач инженера данных",
      "columns": [
        {
          "name": "workload_type",
          "type": "STRING"
        },
        {
          "name": "example_task",
          "type": "STRING"
        },
        {
          "name": "best_tool",
          "type": "STRING"
        }
      ],
      "sampleRows": [
        {
          "workload_type": "I/O-Bound",
          "example_task": "Скачивание 1000 файлов из S3 / API",
          "best_tool": "asyncio / ThreadPoolExecutor"
        },
        {
          "workload_type": "CPU-Bound",
          "example_task": "Сжатие тяжелых дампов / расчет хэшей",
          "best_tool": "ProcessPoolExecutor (multiprocessing)"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Миф о медленном Python: когда GIL мешает, а когда нет\n\nНа каждом собеседовании Data Engineer спрашивают про **GIL (Global Interpreter Lock)**. Поскольку управление памятью в CPython основано на подсчете ссылок (`ob_refcnt`), интерпретатор защищает внутренние структуры одной глобальной мьютекс-блокировкой. Из-за этого даже на 64-ядерном сервере два потока `threading.Thread`, считающие математику в цикле, будут выполняться **по очереди на одном ядре**.\n\nЗначит ли это, что многопоточность и асинхронность в Python бесполезны для дата-инженера? **Категорически нет!**\n\n90% работы ETL-скриптов — это **I/O-Bound (ожидание ввода-вывода)**:\n- Запрос к внешнему API (ждем сеть 200 мс).\n- Скачивание Parquet-партиций из S3 (ждем сокет).\n- Ожидание выполнения тяжелого SQL-запроса на стороне ClickHouse или Snowflake.\n\n**Критическая деталь физики CPython:** как только поток обращается к системному вызову ввода-вывода (чтение сокета сети или диска в ОС), **CPython принудительно отпускает GIL**! Пока один поток ждет ответа от сервера API, десятки других потоков или корутин `asyncio` свободно отправляют свои запросы.\n\n#### Опасность неконтролируемого параллелизма: `asyncio.Semaphore`\nЕсли у вас есть список из 10 000 URL-адресов и вы запустите их все одновременно через `asyncio.gather(*tasks)` без ограничений — вы откроете 10 000 сокетов за миллисекунду, убьете целевой сервер (эффект DDoS) или упадете с ошибкой ОС `Too many open files`. Всегда ограничивайте параллелизм пулом воркеров или семафором!"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Шахматный гроссмейстер на сеансе одновременной игры",
      "content": "GIL — это один гроссмейстер (ядро CPU).\nЕсли заставить его решать в уме сложные интегралы (CPU-Bound), он может думать только над одной задачей за раз — тут нужны еще гроссмейстеры (`multiprocessing`).\nНо в сеансе одновременной игры с 20 любителями (I/O-Bound запросы к API) гроссмейстер делает ход за 1 секунду и переходит к следующему столу, пока соперник думает 5 минут. Один мастер легко ведет 20 партий параллельно!"
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: time.sleep() внутри async def замораживает весь воркер",
      "content": "Классический баг при переходе на `asyncio`: инженер пишет асинхронную функцию `async def fetch()` и для паузы между ретраями вызывает синхронный `time.sleep(5)` вместо `await asyncio.sleep(5)` (или использует синхронный `requests.get()` вместо `httpx` / `aiohttp`).\nСинхронный вызов блокирует весь Event Loop! Все 100 параллельных корутин замирают и ждут эти 5 секунд по очереди, превращая асинхронный код в медленный последовательный скрипт."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Чем отличается ThreadPoolExecutor от ProcessPoolExecutor и что выбрать для парсинга API?",
      "content": "1) `ThreadPoolExecutor` (потоки) работает внутри одного процесса с общей памятью. Идеален для I/O-задач (запросы к API, S3, БД), так как во время сетевого ожидания GIL освобождается, а накладные расходы на создание потока минимальны.\n2) `ProcessPoolExecutor` (процессы) поднимает отдельные копии интерпретатора Python со своим собственным GIL на разных ядрах CPU. Нужен для тяжелых CPU-Bound вычислений в чистом Python, но требует сериализации данных (`pickle`) для передачи между процессами."
    }
  ],
  "taskDescription": "При параллельной выгрузке тысяч страниц из API с лимитом одновременных соединений задачи необходимо агрегировать из разных воркеров.\nРеализуйте функцию 'merge_worker_metrics(worker_results: list[dict[str, int]]) -> dict[str, int]', которая принимает список словарей со статистикой обработанных строк от параллельных воркеров (например, [{'rows': 100, 'errors': 2}, {'rows': 250, 'errors': 0, 'retries': 1}]) и безопасно суммирует все одноименные метрики в единый итоговый словарь.",
  "seedCode": "sample_worker_stats = [\n    {\"rows\": 1200, \"errors\": 3, \"bytes\": 45000},\n    {\"rows\": 800, \"errors\": 0, \"bytes\": 30000, \"retries\": 2},\n    {\"rows\": 1500, \"errors\": 1, \"bytes\": 60000}\n]",
  "initialCode": "def merge_worker_metrics(worker_results: list[dict[str, int]]) -> dict[str, int]:\n    # Суммируйте показатели со всех параллельных воркеров\n    pass",
  "solutionCode": "def merge_worker_metrics(worker_results: list[dict[str, int]]) -> dict[str, int]:\n    total: dict[str, int] = {}\n    for res in worker_results:\n        for k, v in res.items():\n            total[k] = total.get(k, 0) + v\n    return total",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 2
  },
  "brokenProdTask": {
    "title": "Инцидент #229: Дублирование данных между воркерами из-за мутируемого дефолтного аргумента",
    "incidentDescription": "В функции сбора страниц API использовался дефолтный аргумент collected=[]. В Python список по умолчанию создается ОДИН РАЗ при объявлении функции! В результате каждый следующий вызов воркера дописывал данные в старый список предыдущего запуска, задваивая выгрузку.",
    "buggyCode": "def collect_page_items(new_items: list, collected: list = []) -> list:\n    # БАГ: список collected разделяется между всеми вызовами функции!\n    for item in new_items:\n        collected.append(item)\n    return collected",
    "fixHint": "Замените дефолтное значение на collected: list | None = None и внутри функции инициализируйте новый список, если передан None.",
    "solutionCode": "def collect_page_items(new_items: list, collected: list | None = None) -> list:\n    if collected is None:\n        collected = []\n    for item in new_items:\n        collected.append(item)\n    return collected",
    "testConfig": {
      "checkOrder": true,
      "floatPrecision": 2
    }
  },
  "hints": [
    "Создайте пустой результирующий словарь total = {}.",
    "Пройдитесь внешним циклом по списку словарей worker_results, а внутренним — по .items() каждого словаря.",
    "Обновляйте сумму через total[k] = total.get(k, 0) + v."
  ]
},
{
  "id": "python-12",
  "moduleSlug": "python",
  "order": 12,
  "title": "Тестирование дата-пайплайнов (pytest), Чистые функции и Data Quality Assertions",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "Pure Function (Чистая функция)",
      "definition": "Детерминированная функция, результат которой зависит только от входных аргументов и не имеет побочных эффектов (не ходит в сеть или глобальные переменные)."
    },
    {
      "term": "Dependency Injection / Mocking",
      "definition": "Подмена реального сетевого клиента (S3, Postgres, REST API) тестовым дублером (Mock) для мгновенного и изолированного тестирования логики."
    },
    {
      "term": "WAP (Write-Audit-Publish)",
      "definition": "Архитектурный паттерн: сначала записываем данные во временную staging-таблицу, прогоняем автотесты качества (Data Quality), и только при успехе публикуем в прод."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "dq_audit_results",
      "description": "Результаты автоматических проверок качества витрины перед публикацией",
      "columns": [
        {
          "name": "check_name",
          "type": "STRING"
        },
        {
          "name": "passed",
          "type": "BOOLEAN"
        },
        {
          "name": "details",
          "type": "STRING"
        }
      ],
      "sampleRows": [
        {
          "check_name": "no_null_primary_keys",
          "passed": true,
          "details": "0 nulls found"
        },
        {
          "check_name": "revenue_reconciliation",
          "passed": false,
          "details": "Diff 1450.00 exceeds tolerance 0.01"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Как тестировать ETL-код без поднятия реального кластера\n\nЧастая отговорка в командах данных: *«Мы не пишем unit-тесты на пайплайны, потому что для этого нужно подключение к продакшен-базе и S3»*. Это признак плохой архитектуры, где **бизнес-логика трансформации намертво перемешана с вводом-выводом (I/O)**:\n\n```python\n# ❌ НЕТЕСТИРУЕМЫЙ МОНОЛИТ (I/O + Бизнес-логика в одной каше)\ndef process_daily_sales():\n    resp = requests.get(\"[https://api.corp.internal/sales](https://api.corp.internal/sales)\")  # Жесткая привязка к сети\n    data = resp.json()\n    cleaned = [{\"id\": r[\"id\"], \"net\": round(r[\"gross\"] / 1.2, 2)} for r in data]\n    pg_conn.execute_values(\"INSERT INTO sales ...\", cleaned)  # Жесткая привязка к БД\n```\nЧтобы протестировать правильность деления на `1.2`, вам придется мокать библиотеку `requests` и драйвер `psycopg2`.\n\n#### Архитектура функционального ядра (Functional Core, Imperative Shell)\nОпытный инженер разделяет код на два слоя:\n1. **Чистые функции трансформации (Pure Functions):** принимают на вход обычные структуры данных (`list[dict]`, `Iterator`), выполняют фильтрацию, обогащение, расчеты и возвращают результат. Они **ничего не знают** ни про S3, ни про Postgres! Их можно покрыть сотней тестов `pytest` за 0.05 секунды.\n2. **Тонкая инфраструктурная оболочка (I/O Shell) + Data Quality Gate:** читает данные из источника, передает в чистую функцию, проверяет инварианты качества (Data Quality Assertions: сходимость контрольных сумм, отсутствие дубликатов PK, непустота батча) и пишет в БД."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Проверка рецепта соуса без похода в супермаркет",
      "content": "Смешивать чтение из БД и бизнес-логику — это как если бы шеф-повар для проверки вкуса нового соуса каждый раз лично ехал на ферму доить корову и собирать помидоры.\nЧистая функция (Pure Function) — это когда продукты уже лежат на столе в мисках (входные аргументы): повар смешивает их по формуле и пробует результат за 10 секунд в полной изоляции от внешнего мира."
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Сравнение финансовых сумм float через == в тестах",
      "content": "В стандарте IEEE 754 арифметика с плавающей точкой в двоичном коде дает погрешность представления: в Python выражение `0.1 + 0.2 == 0.3` возвращает **`False`** (так как `0.1 + 0.2` равно `0.30000000000000004`)!\nЕсли ваша Data Quality проверка сверяет сумму заказов в источнике и витрине через `assert source_sum == target_sum`, пайплайн будет постоянно падать на расхождении в `0.000000000001` копейки. Всегда используйте допуск погрешности `abs(a - b) <= tolerance` (или `math.isclose` / `Decimal`)."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Что такое паттерн WAP (Write-Audit-Publish) в тестировании данных?",
      "content": "Даже если unit-тесты кода в `pytest` прошли на 100%, в продакшене могут прийти аномальные данные из источника. Паттерн **Write-Audit-Publish** защищает бизнес-пользователей:\n1) **Write:** пайплайн пишет результат во временную таблицу (`stg_mart_sales`) или закрытую ветку Apache Iceberg.\n2) **Audit:** запускаются автоматические проверки качества (не пустая ли таблица, нет ли `NULL` в ключах, сошлась ли сумма выручки с допуском 0.01).\n3) **Publish:** только если все проверки вернули `True`, данные атомарно публикуются в прод."
    }
  ],
  "taskDescription": "Реализуйте функцию аудита качества витрины 'run_dq_audit(records: list[dict], expected_total: float, tolerance: float = 0.01) -> dict':\nФункция должна проверить три инварианта перед публикацией витрины:\n1. 'not_empty': список records содержит хотя бы одну запись (bool).\n2. 'unique_ids': все значения по ключу 'id' в списке records уникальны и ни одно из них не равно None (bool).\n3. 'sum_matches': разница по модулю между суммой всех полей 'amount' и 'expected_total' не превышает 'tolerance': abs(actual_sum - expected_total) <= tolerance (bool).\nВерните словарь вида: {'passed': (все 3 проверки True), 'not_empty': bool, 'unique_ids': bool, 'sum_matches': bool}.",
  "seedCode": "sample_mart = [\n    {\"id\": \"ord_1\", \"amount\": 0.1},\n    {\"id\": \"ord_2\", \"amount\": 0.2}\n]",
  "initialCode": "def run_dq_audit(records: list[dict], expected_total: float, tolerance: float = 0.01) -> dict:\n    # Реализуйте 3 проверки Data Quality и верните итоговый отчет\n    pass",
  "solutionCode": "def run_dq_audit(records: list[dict], expected_total: float, tolerance: float = 0.01) -> dict:\n    not_empty = len(records) > 0\n    ids = [r.get(\"id\") for r in records]\n    unique_ids = (None not in ids) and (len(set(ids)) == len(ids))\n    actual_sum = sum(float(r.get(\"amount\", 0.0)) for r in records)\n    sum_matches = abs(actual_sum - expected_total) <= tolerance\n    passed = bool(not_empty and unique_ids and sum_matches)\n    return {\n        \"passed\": passed,\n        \"not_empty\": not_empty,\n        \"unique_ids\": unique_ids,\n        \"sum_matches\": sum_matches,\n    }",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 2
  },
  "brokenProdTask": {
    "title": "Инцидент #235: Ложное срабатывание алерта сверки балансов из-за IEEE 754 float ==",
    "incidentDescription": "Ночной аудит сверки бухгалтерского баланса упал при сравнении суммы [0.1, 0.2] с эталоном 0.3 через оператор строгого равенства == из-за погрешности двоичного представления float.",
    "buggyCode": "def verify_balance_reconciliation(chunks: list[float], target: float) -> bool:\n    # БАГ: sum([0.1, 0.2]) == 0.3 возвращает False в Python!\n    return sum(chunks) == target",
    "fixHint": "Замените строгое сравнение == на проверку разницы по модулю: abs(sum(chunks) - target) <= 1e-6.",
    "solutionCode": "def verify_balance_reconciliation(chunks: list[float], target: float) -> bool:\n    return abs(sum(chunks) - target) <= 1e-6",
    "testConfig": {
      "checkOrder": true,
      "floatPrecision": 2
    }
  },
  "hints": [
    "Проверка непустоты: not_empty = len(records) > 0.",
    "Соберите список ids = [r.get(\"id\") for r in records] и проверьте (None not in ids) and (len(set(ids)) == len(ids)).",
    "Для сверки суммы используйте abs(actual_sum - expected_total) <= tolerance."
  ]
}
];
