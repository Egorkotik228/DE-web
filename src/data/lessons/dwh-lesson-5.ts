import { Lesson } from '@/types/course';

export const dwhLesson5: Lesson = {
  "id": "dwh-5",
  "moduleSlug": "dwh",
  "order": 5,
  "title": "Продвинутое моделирование фактов и измерений: Factless Fact Tables, Conformed Dimensions, Role-Playing и Junk Dimensions",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "Factless Fact Table",
      "definition": "Таблица фактов без числовых показателей (метрик). Служит исключительно для фиксации факта наступления события (например, посещение студентом лекции)."
    },
    {
      "term": "Role-Playing Dimension",
      "definition": "Единая физическая таблица измерения, выступающая в разных логических ролях в одном факте (например, dim_date как order_date, ship_date и delivery_date)."
    },
    {
      "term": "Junk Dimension (Хламовое измерение)",
      "definition": "Единая таблица, объединяющая разрозненные дискретные флаги и статусы (is_promo, payment_method, delivery_type) для устранения десятков мелких внешних ключей в факте."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "dim_junk_order_flags",
      "description": "Хламовое измерение (Junk Dimension) комбинаций флагов заказа",
      "columns": [
        {
          "name": "junk_sk",
          "type": "INT",
          "keyType": "PK"
        },
        {
          "name": "is_first_order",
          "type": "BOOLEAN"
        },
        {
          "name": "is_gift",
          "type": "BOOLEAN"
        },
        {
          "name": "payment_channel",
          "type": "VARCHAR(20)"
        }
      ],
      "sampleRows": [
        {
          "junk_sk": 1,
          "is_first_order": true,
          "is_gift": false,
          "payment_channel": "SBP"
        },
        {
          "junk_sk": 2,
          "is_first_order": false,
          "is_gift": true,
          "payment_channel": "CARD"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Продвинутые паттерны размерного моделирования\n\nКогда базовых звездных схем недостаточно для описания сложных бизнес-процессов, в арсенале дата-инженера применяются паттерны промышленного проектирования DWH:\n\n#### 1. Factless Fact Tables (Бесфакторные таблицы фактов)\nЧто делать, если событие не имеет суммы или количества? Например, посещение студентом занятий или промо-акция, охватившая товар. В такой таблице есть только суррогатные ключи измерений:\n```sql\nCREATE TABLE fct_attendance (\n    student_sk INT,\n    course_sk INT,\n    date_sk INT,\n    PRIMARY KEY (student_sk, course_sk, date_sk)\n);\n```\nМетрикой здесь является сам факт наличия строки (`COUNT(*)`).\n\n#### 2. Role-Playing Dimensions (Измерения с ролями)\nВ интернет-заказе есть дата создания, дата оплаты и дата доставки. Нужно ли создавать три отдельные физические таблицы `dim_order_date`, `dim_pay_date`, `dim_delivery_date`?\n**Нет!** Создается одна таблица `dim_date`, а в запросе или представлении (VIEW) она джойнится трижды с разными алиасами.\n\n#### 3. Junk Dimensions (Хламовые измерения)\nЕсли у заказа 8 булевых флагов (`is_cashback`, `is_call_needed`, `is_priority`...), хранение 8 FK в таблице фактов раздует строку на 64 байта.\nВсе возможные комбинации ($2^8 = 256$ строк) объединяются в одно измерение **`dim_junk_order_flags`**, а в факт помещается ровно один суррогатный ключ `junk_sk`.\n\n#### 4. Conformed Dimensions (Согласованные измерения)\nИзмерение клиентов или календаря, общее для десятка витрин компании. Позволяет делать сквозные отчеты по всей цепочке создания ценности (Enterprise Data Bus)."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Один актер в разных спектаклях",
      "content": "Role-Playing Dimension — это талантливый актер (таблица dim_date). Утром он играет роль «Даты оформления заказа», днем — роль «Даты оплаты», а вечером — «Даты вручения курьером». Текст пьесы разный, но человек один и тот же."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Оптимизация схемы факта через Junk Dimension",
        "beforeDescription": "8 отдельных колонок флагов в таблице фактов",
        "beforeColumns": [
          "fct_design",
          "row_width_bytes",
          "indexing_overhead"
        ],
        "beforeRows": [
          [
            "8 separate flag columns",
            "64-128 bytes per fact row",
            "8 individual B-Tree indexes"
          ],
          [
            "Uncompressed booleans",
            "Huge storage bloat on 1B rows",
            "High buffer pool usage"
          ],
          [
            "Cluttered fact schema",
            "Complex ad-hoc queries",
            "Hard to maintain in BI"
          ]
        ],
        "afterDescription": "Сжатие до одного суррогатного ключа junk_sk",
        "afterColumns": [
          "fct_design",
          "row_width_bytes",
          "indexing_overhead"
        ],
        "afterRows": [
          [
            "Single INT junk_sk",
            "4 bytes per fact row",
            "Single compact index"
          ],
          [
            "256 rows in junk dim",
            "Zero bloat in fact table",
            "95% RAM saving in cache"
          ],
          [
            "Clean fact table",
            "Self-describing BI models",
            "Standardized attributes"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Десять копий календаря парализовали хранилище",
      "content": "Инженер создал 12 физических копий таблицы дат для каждой даты в логистическом цикле. При добавлении производственного календаря праздников данные обновили в 10 таблицах, а в 2 забыли. Сроки доставки исказились на 3 дня."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Зачем нужна бесфакторная таблица фактов (Factless Fact Table)?",
      "content": "**Ответ:** 1) Для фиксации фактов событий без числовых мер (посещаемость лекций, проход через турникет). 2) Для фиксации охвата или условий применимости (Coverage table: какие товары участвовали в промо-акции в конкретные дни), чтобы находить товары без продаж через анти-джойн (NOT EXISTS)."
    }
  ],
  "taskDescription": "Смоделируйте Role-Playing Dimension и расчет времени доставки заказа:\n1. Создайте измерение календаря 'dim_dates' (date_sk INT PRIMARY KEY, calendar_date VARCHAR(10) NOT NULL, day_of_week VARCHAR(15) NOT NULL).\n2. Создайте таблицу фактов 'fct_deliveries' (order_id INT PRIMARY KEY, order_date_sk INT NOT NULL, delivery_date_sk INT NOT NULL, cargo_weight_kg NUMERIC(8,2) NOT NULL).\n3. Вставьте в 'dim_dates' дни:\n   (1, '2026-11-01', 'Воскресенье'), (2, '2026-11-02', 'Понедельник'), (3, '2026-11-04', 'Среда').\n4. Вставьте заказ в 'fct_deliveries': order_id = 101, оформлен 2026-11-01 (sk=1), доставлен 2026-11-04 (sk=3), вес = 15.50.\n5. Напишите запрос, выводящий 'order_id', дату заказа 'order_date', день недели заказа 'order_dow', дату доставки 'delivery_date' и день недели доставки 'delivery_dow', соединив 'dim_dates' дважды с разными псевдонимами.",
  "seedCode": "",
  "initialCode": "-- 1. Создайте dim_dates и fct_deliveries\n-- 2. Вставьте тестовые записи\n-- 3. Выполните SELECT с двойным джойном dim_dates",
  "solutionCode": "CREATE TABLE dim_dates (\n    date_sk INT PRIMARY KEY,\n    calendar_date VARCHAR(10) NOT NULL,\n    day_of_week VARCHAR(15) NOT NULL\n);\n\nCREATE TABLE fct_deliveries (\n    order_id INT PRIMARY KEY,\n    order_date_sk INT NOT NULL,\n    delivery_date_sk INT NOT NULL,\n    cargo_weight_kg NUMERIC(8,2) NOT NULL\n);\n\nINSERT INTO dim_dates VALUES\n(1, '2026-11-01', 'Воскресенье'),\n(2, '2026-11-02', 'Понедельник'),\n(3, '2026-11-04', 'Среда');\n\nINSERT INTO fct_deliveries VALUES (101, 1, 3, 15.50);\n\nSELECT \n    f.order_id,\n    d_order.calendar_date AS order_date,\n    d_order.day_of_week AS order_dow,\n    d_deliv.calendar_date AS delivery_date,\n    d_deliv.day_of_week AS delivery_dow\nFROM fct_deliveries f\nJOIN dim_dates d_order ON f.order_date_sk = d_order.date_sk\nJOIN dim_dates d_deliv ON f.delivery_date_sk = d_deliv.date_sk;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 0,
    "expectedRowCount": 1,
    "expectedColumns": [
      "order_id",
      "order_date",
      "order_dow",
      "delivery_date",
      "delivery_dow"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #405: Дублирование таблиц календаря привело к десинхронизации отчетов",
    "incidentDescription": "Создали две физические таблицы dim_order_date и dim_ship_date, забыв обновить праздники во второй.",
    "buggyCode": "CREATE TABLE dim_order_date (d_sk INT, d VARCHAR(10)); CREATE TABLE dim_ship_date (d_sk INT, d VARCHAR(10));",
    "fixHint": "Используйте единую таблицу dim_dates в качестве Role-Playing Dimension с разными алиасами в запросе.",
    "solutionCode": "CREATE TABLE dim_dates (date_sk INT PRIMARY KEY, calendar_date VARCHAR(10), day_of_week VARCHAR(15));",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Создайте dim_dates и fct_deliveries с указанными полями.",
    "В секции FROM соедините dim_dates дважды: JOIN dim_dates d_order ON f.order_date_sk = d_order.date_sk.",
    "Второй джойн выполните с алиасом d_deliv: JOIN dim_dates d_deliv ON f.delivery_date_sk = d_deliv.date_sk."
  ]
};
