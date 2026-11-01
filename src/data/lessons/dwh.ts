import { Lesson } from '@/types/course';

export const dwhLessons: Lesson[] = [
  {
    id: 'dwh-scd2',
    moduleSlug: 'dwh',
    order: 1,
    title: 'Моделирование измерений SCD Type 2 и витрин Кимбалла',
    estimatedMinutes: 35,
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Архитектура корпоративных DWH: Подход Ральфа Кимбалла и версионность SCD2

В аналитических хранилищах данных (DWH) ключевой задачей является сохранение **исторической правды**. В операционных OLTP-базах при смене адреса или фамилии клиента запись просто перезаписывается (\`UPDATE customers SET address = '...' WHERE id = 42\`). Но если клиент совершил покупку в январе, проживая в Новосибирске, а в марте переехал в Москву, то в годовом отчете январская выручка должна относиться к сибирскому филиалу!

Если мы просто обновим адрес (\`SCD Type 1\`), мы исказим финансовую отчетность задним числом. Для сохранения истории изменений используется стандарт **Slowly Changing Dimensions (SCD Type 2)**.

#### Механика SCD Type 2 под капотом
1. **Суррогатный первичный ключ (\`customer_sk\`):** синтетическое число или хэш, уникальный для каждой версии строки.
2. **Бизнес-ключ (\`customer_id\`):** неизменяемый идентификатор клиента из исходной CRM/ERP системы.
3. **Интервал валидности:** поля \`effective_from\` (дата вступления версии в силу) и \`effective_to\` (дата закрытия версии).
4. **Флаг актуальности:** булево поле \`is_current\` (равно \`TRUE\` только для последней действующей версии) либо дата \`9999-12-31 23:59:59\`.

Когда в источнике меняется атрибут:
- Действующая строка закрывается: \`UPDATE dim_customer SET effective_to = CURRENT_TIMESTAMP, is_current = FALSE WHERE customer_id = 42 AND is_current = TRUE;\`
- Вставляется новая версия: \`INSERT INTO dim_customer (customer_id, address, effective_from, effective_to, is_current) VALUES (42, 'Москва', CURRENT_TIMESTAMP, '9999-12-31', TRUE);\``,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Трудовая книжка vs Паспорт',
        content:
          'SCD Type 1 похож на замену фотографии в паспорте — старой больше не существует, есть только текущее состояние. SCD Type 2 похож на трудовую книжку — каждая новая должность записывается новой строкой с датой приказа «С...» и «По...». Вы всегда можете точно узнать, кем вы были 3 года назад.',
      },
      {
        type: 'er-diagram',
        data: {
          tables: [
            {
              name: 'dim_customer_scd2',
              role: 'standard',
              columns: [
                { name: 'customer_sk', type: 'BIGINT', keyType: 'PK', description: 'Суррогатный ключ версии' },
                { name: 'customer_id', type: 'INT', keyType: 'BK', description: 'Бизнес-ключ CRM' },
                { name: 'city', type: 'VARCHAR(100)', description: 'Город проживания' },
                { name: 'effective_from', type: 'TIMESTAMP', description: 'Начало действия версии' },
                { name: 'effective_to', type: 'TIMESTAMP', description: 'Окончание действия версии' },
                { name: 'is_current', type: 'BOOLEAN', description: 'Флаг текущей версии' },
              ],
            },
            {
              name: 'fct_orders',
              role: 'standard',
              columns: [
                { name: 'order_id', type: 'BIGINT', keyType: 'PK' },
                { name: 'customer_sk', type: 'BIGINT', keyType: 'FK', description: 'Связь с точной версией клиента на момент покупки' },
                { name: 'order_dts', type: 'TIMESTAMP' },
                { name: 'amount', type: 'NUMERIC(12,2)' },
              ],
            },
          ],
          relationships: [
            { fromTable: 'fct_orders', fromColumn: 'customer_sk', toTable: 'dim_customer_scd2', toColumn: 'customer_sk', cardinality: '1:N' },
          ],
        },
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Джойн фактов с SCD2 без учета времени',
        content:
          'Классический баг джуниоров: джойнить \`fct_orders\` с \`dim_customer\` по \`customer_id\` вместо суррогатного \`customer_sk\`. Если у клиента 5 версий в истории, факт размножится ровно в 5 раз, и выручка в дашборде вырастет на 500%!',
      },
    ],
    glossaryTerms: [
      { term: 'SCD Type 2', definition: 'Методология сохранения полной истории изменений размерности путем добавления новой строки с временным интервалом effective_from/to.' },
      { term: 'Surrogate Key', definition: 'Искусственный первичный ключ (обычно автоинкремент или хэш), не имеющий прямого бизнес-смысла и уникальный для каждой строки витрины.' },
      { term: 'Kimball CIF', definition: 'Подход снизу вверх: DWH строится из согласованных матриц фактов и измерений (Star/Snowflake Schema).' },
    ],
    schemaPreview: [
      {
        tableName: 'dim_customer_scd2',
        columns: [
          { name: 'customer_sk', type: 'BIGINT', keyType: 'PK' },
          { name: 'customer_id', type: 'INT', keyType: 'BK' },
          { name: 'city', type: 'VARCHAR(64)' },
          { name: 'effective_from', type: 'TIMESTAMP' },
          { name: 'effective_to', type: 'TIMESTAMP' },
          { name: 'is_current', type: 'BOOLEAN' },
        ],
        sampleRows: [
          { customer_sk: 1, customer_id: 101, city: 'Новосибирск', effective_from: '2025-01-01', effective_to: '2025-03-15', is_current: false },
          { customer_sk: 2, customer_id: 101, city: 'Москва', effective_from: '2025-03-15', effective_to: '9999-12-31', is_current: true },
        ],
      },
    ],
    taskDescription:
      'В тренажере Schema Builder спроектируйте измерение `Dim_Customer` со стереотипом `Dim (SCD2)`. Добавьте в таблицу поля `customer_id` (BK), `customer_name` (Attribute), `effective_from` (Metadata), `effective_to` (Metadata) и `is_current` (Metadata). Проверьте корректность архитектуры нажатием кнопки «Проверить архитектуру».',
    seedCode: '',
    initialCode: '-- Спроектируйте витрину SCD2 на интерактивном холсте или напишите SQL-запрос закрытия старой версии:\nUPDATE dim_customer_scd2\nSET effective_to = CURRENT_TIMESTAMP, is_current = FALSE\nWHERE customer_id = 101 AND is_current = TRUE;',
    solutionCode: 'UPDATE dim_customer_scd2\nSET effective_to = CURRENT_TIMESTAMP, is_current = FALSE\nWHERE customer_id = 101 AND is_current = TRUE;',
    testConfig: {
      checkOrder: false,
      floatPrecision: 2,
      requiredAstPatterns: ['Dim_Customer', 'effective_from', 'effective_to'],
    },
    brokenProdTask: {
      title: 'Авария: Задвоение выручки из-за прямого джойна',
      incidentDescription:
        'P1 Incident: В квартальном финансовом отчете сумма продаж превысила реальный оборот компании на 40%. Аналитики жалуются на Cartesian product при джойне фактов с клиентами.',
      buggyCode: 'SELECT SUM(f.amount) FROM fct_orders f JOIN dim_customer_scd2 d ON f.customer_id = d.customer_id;',
      fixHint: 'Ограничьте выборку только актуальными версиями (d.is_current = TRUE) либо используйте суррогатный ключ customer_sk.',
      solutionCode: 'SELECT SUM(f.amount) FROM fct_orders f JOIN dim_customer_scd2 d ON f.customer_sk = d.customer_sk;',
      testConfig: { checkOrder: false, floatPrecision: 2 },
    },
    hints: [
      'Выберите в селекторе создания таблицы стереотип «Dim (SCD2)».',
      'Обязательно добавьте поля effective_from и effective_to для контроля версионности.',
      'Нажмите «Проверить архитектуру» в правом верхнем углу.',
    ],
  },
];
