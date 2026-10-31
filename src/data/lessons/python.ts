import { Lesson } from '@/types/course';

export const pythonLessons: Lesson[] = [
  {
    id: 'python-1',
    moduleSlug: 'python',
    order: 1,
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
    id: 'python-2',
    moduleSlug: 'python',
    order: 2,
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
];
