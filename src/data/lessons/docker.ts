import { Lesson } from '@/types/course';

export const dockerLessons: Lesson[] = [
  {
    id: 'docker-compose-stack',
    moduleSlug: 'docker',
    order: 1,
    title: 'Docker & Compose: Изоляция процессов, слои образов и оркестрация локального дата-стека',
    estimatedMinutes: 35,
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Физика контейнеризации Linux: Namespaces, Cgroups и OverlayFS

Контейнеры Docker — это не виртуальные машины! В них нет гипервизора и гостевой операционной системы. Контейнер — это **обычный процесс Linux**, запущенный в пространстве изолированных пространств имен ядра.

#### Три столпа контейнеризации:
1. **Linux Namespaces (Изоляция пространства имен):**
   - \`pid\` — изолирует дерево процессов (внутри контейнера процесс видит себя как PID 1).
   - \`net\` — изолирует виртуальные сетевые интерфейсы, IP-адреса и таблицы маршрутизации.
   - \`mnt\` — изолирует файловую систему и точки монтирования.
   - \`ipc\`, \`uts\`, \`user\`.
2. **Control Groups (Cgroups — Ограничение ресурсов):**
   - Ограничение CPU: сколько ядер или квантов процессорного времени разрешено процессу.
   - Ограничение RAM: жесткий лимит памяти (при превышении срабатывает \`OOM Killer\`, и контейнер завершается с кодом 137).
3. **OverlayFS (Слои образов Union File System):**
   - Слои образов доступны только для чтения (\`Read-Only\`).
   - При запуске контейнера поверх накладывается тонкий слой для записи (\`Read-Write Container Layer\`) по технологии Copy-on-Write (CoW).

#### Multi-stage сборка Dockerfile для дата-пайплайнов
Для минимизации размера образа и исключения уязвимостей используется многоэтапная сборка: компиляция зависимостей в тяжелом образе сборщика и перенос готовых бинарников в ультралегкий \`distroless\` или \`alpine\` образ.`,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Отель vs Собственный дом',
        content:
          'Виртуальная машина похожа на покупку отдельного дома со своим фундаментом, бойлером и крышей (полное дублирование ОС, трата гигабайт памяти). Контейнер похож на номер в отеле: гости изолированы друг от друга, у каждого своя дверь (namespace) и лимит на полотенца (cgroup), но водопровод и электричество общие (общее ядро Linux).',
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Запуск контейнера от root в production',
        content:
          'Если контейнер с Airflow или Spark запущен под \`USER root\` и сервис будет взломан через уязвимость в библиотеке, злоумышленник получит доступ к root хостовой машины через уязвимости escape container. Всегда указывайте \`USER 50000:0\` в Dockerfile!',
      },
    ],
    glossaryTerms: [
      { term: 'Namespaces', definition: 'Функция ядра Linux, изолирующая системные ресурсы (PID, Network, Mount) для группы процессов.' },
      { term: 'Cgroups', definition: 'Механизм ядра Linux для учета и жесткого ограничения потребления ресурсов (CPU, Memory, I/O).' },
      { term: 'OOM Killer', definition: 'Механизм ядра, принудительно убивающий процесс с кодом ошибки 137 при превышении лимита оперативной памяти.' },
    ],
    schemaPreview: [
      {
        tableName: 'compose_services',
        columns: [
          { name: 'service_name', type: 'VARCHAR(32)' },
          { name: 'image', type: 'VARCHAR(64)' },
          { name: 'ports', type: 'VARCHAR(32)' },
          { name: 'restart_policy', type: 'VARCHAR(32)' },
        ],
        sampleRows: [
          { service_name: 'postgres_dwh', image: 'postgres:16-alpine', ports: '5432:5432', restart_policy: 'always' },
          { service_name: 'minio_s3', image: 'minio/minio:latest', ports: '9000:9000', restart_policy: 'always' },
        ],
      },
    ],
    taskDescription:
      'В тренажере CodeValidatorEngine проверьте конфигурацию `docker-compose.yml` локального дата-стека: убедитесь в наличии сервисов `postgres` и `minio`, пробросе портов, монтировании персистентных volumes и наличии проверок работоспособности `healthcheck`. Нажмите «Проверить конфигурацию».',
    seedCode: '',
    initialCode: `# Docker Compose: Локальный стек инженера данных
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: de_postgres
    environment:
      POSTGRES_USER: dataeng
      POSTGRES_PASSWORD: secretpassword
      POSTGRES_DB: analytics
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dataeng"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: de_minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadminpassword
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
`,
    solutionCode: 'healthcheck:\nvolumes:\npostgres_data:\nminio_data:',
    testConfig: {
      checkOrder: false,
      floatPrecision: 2,
      requiredAstPatterns: ['postgres', 'minio', 'healthcheck', 'volumes'],
    },
    brokenProdTask: {
      title: 'Авария: Потеря всех данных при перезапуске контейнера',
      incidentDescription:
        'P1 Incident: После перезагрузки сервера базы данных все таблицы и отчеты за месяц исчезли, потому что в compose не был объявлен persistent volume.',
      buggyCode: 'postgres:\n  image: postgres:16\n  ports: ["5432:5432"]',
      fixHint: 'Добавьте volumes: - postgres_data:/var/lib/postgresql/data для сохранения данных на хосте.',
      solutionCode: 'postgres:\n  image: postgres:16\n  volumes: [postgres_data:/var/lib/postgresql/data]',
      testConfig: { checkOrder: false, floatPrecision: 2 },
    },
    hints: [
      'Убедитесь, что объявлены persistent volumes для postgres и minio.',
      'Проверьте наличие healthcheck для безопасного старта зависимых сервисов.',
      'Нажмите «Проверить конфигурацию» для запуска валидатора.',
    ],
  },
];
