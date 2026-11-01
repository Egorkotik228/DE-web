import { Lesson } from '@/types/course';

export const airflowLessons: Lesson[] = [
  {
    id: 'airflow-idempotency',
    moduleSlug: 'airflow',
    order: 1,
    title: 'Архитектура Apache Airflow и проектирование идемпотентных DAG',
    estimatedMinutes: 40,
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Apache Airflow: Архитектура планировщика и закон идемпотентности

Apache Airflow — это оркестратор рабочих процессов на основе кода (Workflow as Code). Главное заблуждение начинающих инженеров: считать Airflow движком обработки данных. **Airflow не обрабатывает данные!** Он лишь раздает команды внешним системам (Spark, ClickHouse, Postgres, dbt, Kubernetes).

#### Компоненты архитектуры Airflow
1. **Scheduler (Планировщик):** многопоточный демон, непрерывно сканирующий папку \`dags/\`, строящий DAG-графы и отправляющий готовые задачи (\`queued\`) в очередь Executor'а.
2. **Webserver:** интерфейс на Flask, визуализирующий статус запусков (Grid View, Graph View) и позволяющий перезапускать таски вручную.
3. **Metadata Database (PostgreSQL):** единый источник правды, хранящий состояния дагов, XCom, переменные (Variables) и пулы соединений (Connections).
4. **Executor & Workers (Local / Celery / KubernetesExecutor):** исполнители, запускающие задачи в изолированных процессах или подах K8s.

#### Главный закон дата-инженерии: Идемпотентность (Idempotency)
Пайплайн называется **идемпотентным**, если его повторный запуск за ту же расчетную дату (\`logical_date\` / \`{{ ds }}\`) дает **абсолютно идентичный результат** и не приводит к дублированию строк!
- ❌ **Неидемпотентно:** \`INSERT INTO daily_stats SELECT * FROM raw_data WHERE dt = '{{ ds }}';\` (при 3 перезапусках выручка утроится!).
- ✅ **Идемпотентно (WAP Pattern):**
  \`\`\`sql
  DELETE FROM daily_stats WHERE dt = '{{ ds }}';
  INSERT INTO daily_stats SELECT * FROM raw_data WHERE dt = '{{ ds }}';
  \`\`\``,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Кнопка вызова лифта',
        content:
          'Кнопка вызова лифта идемпотентна: сколько бы раз вы ни нажали на нее (1 раз или 50 раз), приедет ровно один лифт. Кнопка выдачи денег в банкомате НЕ идемпотентна — 3 нажатия спишут сумму 3 раза. Ваши даги обязаны быть как кнопка лифта.',
      },
      {
        type: 'data-flow',
        data: {
          nodes: [
            { id: '1', label: 'ExternalTaskSensor', sublabel: 'mode="reschedule"', type: 'consumer', status: 'success' },
            { id: '2', label: 'PostgresOperator', sublabel: 'DELETE partition {{ ds }}', type: 'transform', status: 'success' },
            { id: '3', label: 'PostgresOperator', sublabel: 'INSERT batch {{ ds }}', type: 'transform', status: 'running' },
            { id: '4', label: 'DataQualityCheck', sublabel: 'Assert count > 0', type: 'storage', status: 'idle' },
          ],
          edges: [
            { from: '1', to: '2', label: 'upstream ok' },
            { from: '2', to: '3', label: 'clean partition' },
            { from: '3', to: '4', label: 'verify metrics' },
          ],
        },
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Тяжелый код на верхнем уровне DAG-файла',
        content:
          'Никогда не делайте \`requests.get()\` или \`pd.read_sql()\` на верхнем уровне файла дага вне оператора! Scheduler перечитывает каждый .py файл каждые 30 секунд. Если 100 дагов будут делать HTTP-запросы при парсинге, CPU планировщика взлетит до 100%, и весь оркестратор зависнет.',
      },
    ],
    glossaryTerms: [
      { term: 'Idempotency', definition: 'Свойство операции давать одинаковый результат при многократном повторении.' },
      { term: 'catchup', definition: 'Параметр DAG, определяющий, нужно ли планировщику запускать все пропущенные исторические интервалы между start_date и текущим днем.' },
      { term: 'Sensor reschedule', definition: 'Режим сенсора, при котором задача освобождает слот воркера и засыпает в БД до следующего тика (в отличие от poke).' },
    ],
    schemaPreview: [
      {
        tableName: 'stage_orders_daily',
        columns: [
          { name: 'order_id', type: 'BIGINT', keyType: 'PK' },
          { name: 'amount', type: 'NUMERIC(12,2)' },
          { name: 'order_date', type: 'DATE' },
        ],
        sampleRows: [
          { order_id: 101, amount: 2500.0, order_date: '2026-11-01' },
          { order_id: 102, amount: 490.0, order_date: '2026-11-01' },
        ],
      },
    ],
    taskDescription:
      'В тренажере CodeValidatorEngine проверьте DAG Airflow на соответствие инженерному стандарту: обеспечьте наличие `catchup=False`, использование сенсора в режиме `mode="reschedule"` и идемпотентную перезапись партиции за дату `{{ ds }}` перед вставкой. Нажмите «Проверить конфигурацию».',
    seedCode: '',
    initialCode: `# Airflow DAG Template
from airflow import DAG
from airflow.operators.postgres import PostgresOperator
from airflow.sensors.external_task import ExternalTaskSensor
from datetime import datetime

with DAG(
    dag_id='daily_etl_orders',
    start_date=datetime(2026, 1, 1),
    schedule='@daily',
    catchup=False,
) as dag:
    wait_task = ExternalTaskSensor(
        task_id='wait_upstream',
        external_dag_id='source_dag',
        mode='reschedule',
    )
    clean_target = PostgresOperator(
        task_id='clean_partition',
        postgres_conn_id='dwh',
        sql="DELETE FROM stage_orders WHERE order_date = '{{ ds }}';",
    )
    load_data = PostgresOperator(
        task_id='load_orders',
        postgres_conn_id='dwh',
        sql="INSERT INTO stage_orders SELECT * FROM raw_orders WHERE dt = '{{ ds }}';",
    )
    wait_task >> clean_target >> load_data
`,
    solutionCode: 'catchup=False\nmode="reschedule"\nDELETE FROM stage_orders WHERE order_date = \'{{ ds }}\';',
    testConfig: {
      checkOrder: false,
      floatPrecision: 2,
      requiredAstPatterns: ['catchup=False', 'reschedule', '{{ ds }}'],
    },
    brokenProdTask: {
      title: 'Авария: Зависание воркеров из-за sensor poke mode',
      incidentDescription:
        'P1 Incident: Все 64 слота Celery-воркеров заняты зависшими сенсорами в режиме poke. Ни одна рабочая задача ETL не может запуститься.',
      buggyCode: 'wait_sensor = ExternalTaskSensor(task_id="wait", mode="poke", poke_interval=10)',
      fixHint: 'Замените режим сенсора на mode="reschedule", чтобы освободить рабочий поток воркера.',
      solutionCode: 'wait_sensor = ExternalTaskSensor(task_id="wait", mode="reschedule", poke_interval=60)',
      testConfig: { checkOrder: false, floatPrecision: 2 },
    },
    hints: [
      'Убедитесь, что в DAG передан параметр catchup=False.',
      'Укажите mode="reschedule" в ExternalTaskSensor.',
      'Добавьте операцию очистки целевой партиции за {{ ds }} перед вставкой данных.',
    ],
  },
];
