export interface PortfolioProject {
  id: string;
  title: string;
  subtitle: string;
  block: string;
  duration: string;
  stack: string[];
  description: string;
  deliverables: string[];
  githubBlueprint: string;
}

export const portfolioProjects: PortfolioProject[] = [
  {
    id: 'project-1',
    title: 'Campus Assistant Data Warehouse',
    subtitle: 'Проектирование аналитического хранилища данных университета',
    block: 'Блок 1-2: Ядро и СУБД',
    duration: 'День 30',
    stack: ['PostgreSQL', 'Python', 'SQL (Window Functions, CTE)', 'Docker'],
    description: 'Полномасштабное DWH для сбора логов проходов по кампусу, расписания и успеваемости. Реализована Star Schema с поддержкой SCD Type 2 и сложная аналитика Gaps & Islands.',
    deliverables: [
      'ER-диаграмма и DDL-скрипты хранилища',
      'Оптимизированные SQL-запросы с EXPLAIN ANALYZE',
      'Готовый дашборд аналитики посещаемости'
    ],
    githubBlueprint: 'Egorkotik228/campus_assistant'
  },
  {
    id: 'project-2',
    title: 'Automated Fintech ELT Pipeline',
    subtitle: 'Оркестрация инкрементальной загрузки и трансформации',
    block: 'Блок 3: Инфраструктура и Оркестрация',
    duration: 'День 60',
    stack: ['Apache Airflow (TaskFlow)', 'dbt Core', 'ClickHouse', 'MinIO (S3)', 'Docker Compose'],
    description: 'Боевой пайплайн инкрементальной выгрузки финансовых транзакций из API в S3, трансформации через dbt (staging -> intermediate -> marts) с тестами качества данных и выгрузкой в ClickHouse.',
    deliverables: [
      'Модульные dbt-модели с инкрементальными макросами',
      'Airflow DAG с обработкой ошибок и Slack-алертом',
      'Автоматические тесты Data Quality (dbt-expectations)'
    ],
    githubBlueprint: 'Egorkotik228/fintech-elt-pipeline'
  },
  {
    id: 'project-3',
    title: 'Real-Time Clickstream & Fraud Detector',
    subtitle: 'Потоковый анализ кликов интернет-магазина и детекция аномалий',
    block: 'Блок 4: Big Data (Spark)',
    duration: 'День 75',
    stack: ['Apache Kafka', 'PySpark Structured Streaming', 'Apache Iceberg', 'MinIO'],
    description: 'Потоковое приложение на PySpark, обрабатывающее лог кликов из Kafka в реальном времени. Применены Watermarks для учета опоздавших данных, оконные агрегации и запись в озеро данных Iceberg (Time Travel).',
    deliverables: [
      'Стриминговое PySpark-приложение с Watermarking',
      'Хранилище Iceberg с историей снимков (Time Travel)',
      'Отчет по предотвращению фрода и борьбе с Data Skew'
    ],
    githubBlueprint: 'Egorkotik228/realtime-fraud-detector'
  },
  {
    id: 'project-4',
    title: 'End-to-End E-Commerce Data Mesh & CDC',
    subtitle: 'Флагманский выпускной проект: репликация из базы в реальном времени',
    block: 'Блок 4: System Design & CDC',
    duration: 'День 90',
    stack: ['Debezium CDC', 'PostgreSQL WAL', 'Apache Kafka', 'ClickHouse', 'Superset'],
    description: 'Сквозная архитектура корпоративного уровня. Debezium считывает логи WAL из PostgreSQL и транслирует изменения в Kafka через Transactional Outbox Pattern. Витрины собираются в ClickHouse для BI.',
    deliverables: [
      'Конфигурация Debezium коннектора и Kafka Connect',
      'Реализация Outbox Pattern для защиты от Dual-Write',
      'Полная System Design архитектурная схема платформы'
    ],
    githubBlueprint: 'Egorkotik228/ecommerce-datamesh-cdc'
  }
];
