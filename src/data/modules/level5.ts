import { TrackModule } from '@/types/course';

export const level5Modules: TrackModule[] = [
  {
    id: 'linux-git',
    slug: 'linux-git',
    title: 'Linux & Git для Data Engineer',
    shortDescription: 'Файловые дескрипторы, пайпы, потоковая обработка в bash (awk/sed/jq), SSH-туннели, systemd и Git-флоу для дата-команд.',
    level: 5,
    levelTitle: 'Уровень 5: Инфраструктура и Оркестрация',
    engineType: 'cli',
    dependencies: ['intro'],
    totalLessons: 8,
    curriculumTopics: [
      'Архитектура Linux: ядро, процессы, системные вызовы и файловые дескрипторы (stdin: 0, stdout: 1, stderr: 2)',
      'Права доступа и безопасность: chmod, chown, SUID/SGID, umask',
      'Конвейеры (Pipes) и потоковая обработка логов без загрузки в память (grep, sed, awk, cut, tr)',
      'Парсинг JSON и NDJSON на лету в терминале с помощью утилиты jq',
      'Фоновые службы и автозапуск: планировщик cron, юниты systemd, таймеры и управление ресурсами',
      'Сетевое взаимодействие: SSH-туннелирование, переброска портов (port-forwarding), curl и rsync',
      'Git-стратегии для DE: interactive rebase, cherry-pick, решение конфликтов в SQL-миграциях',
    ],
    resumeBulletPoints: [
      'Администрирование Linux-серверов обработки данных, настройка демонов systemd и cron-задач',
      'Написание высокопроизводительных bash-скриптов обработки терабайтных логов на базе awk/sed/jq',
      'Организация безопасных сетевых туннелей (SSH port forwarding) для доступа к изолированным базам данных',
      'Настройка Git-флоу дата-команды с версионированием DDL-миграций и автоматизацией CI/CD',
    ],
    cheatSheetMarkdown: `### Linux & Git: Шпаргалка инженера

#### 1. Потоки ввода-вывода и пайпы
\`\`\`bash
# Перенаправление stdout в файл, а stderr в отдельный лог
python etl.py > output.log 2> error.log

# Объединение stdout и stderr в один поток
python etl.py > full.log 2>&1

# Потоковая фильтрация терабайтного gzip-лога без распаковки на диск:
zcat server.log.gz | awk -F',' '$3 == 500 {print $1, $4}' | sort | uniq -c
\`\`\`

#### 2. Магия jq для NDJSON логов
\`\`\`bash
# Выбрать поля user_id и amount для успешных транзакций
cat events.ndjson | jq -r 'select(.status == "SUCCESS") | [.user_id, .amount] | @csv'
\`\`\`

#### 3. SSH туннель к базе данных внутри закрытого контура VPC
\`\`\`bash
# Проброс локального порта 5433 на удаленный Postgres (5432) через Bastion-сервер
ssh -N -L 5433:internal-postgres.db:5432 user@bastion-host.company.com
\`\`\`

#### 4. Git Interactive Rebase (очистка истории коммитов)
\`\`\`bash
git rebase -i HEAD~4
# s (squash) — объединить коммит с предыдущим
# r (reword) — изменить сообщение коммита
\`\`\``,
    interviewQuestions: [
      {
        id: 'linux-q1',
        question: 'Что такое файловый дескриптор в Linux и что означает запись `2>&1`?',
        answer: 'В философии UNIX «всё есть файл». Файловый дескриптор (FD) — это неотрицательное целое число, которое ядро ассоциирует с открытым процессом файлом, сокетом или каналом. По умолчанию: 0 — stdin, 1 — stdout, 2 — stderr. Конструкция `2>&1` означает: перенаправить поток дескриптора 2 (stderr) туда же, куда в данный момент направлен дескриптор 1 (stdout). Это позволяет объединить вывод ошибок и штатных логов в единый файл или пайп.',
        level: 'Junior',
        tags: ['linux', 'io-redirection', 'file-descriptors'],
      },
      {
        id: 'linux-q2',
        question: 'Как с помощью одного конвейера bash найти топ-10 IP-адресов с ошибками 500 в логе на 200 ГБ?',
        answer: 'Команда: `grep " 500 " access.log | awk \'{print $1}\' | sort | uniq -c | sort -nr | head -n 10`. Для огромных файлов, не помещающихся в память, утилита sort автоматически использует внешнюю сортировку через временные файлы на диске (TMPDIR), а grep и awk считывают данные построчно, не вызывая OOM.',
        level: 'Junior',
        tags: ['linux', 'bash', 'cli', 'awk'],
      },
      {
        id: 'linux-q3',
        question: 'В чем разница между Git Merge и Git Rebase и почему Rebase опасен в публичных ветках?',
        answer: 'Git Merge создает дополнительный merge-коммит с двумя родителями, сохраняя точную хронологию веток как они были. Git Rebase берет коммиты текущей ветки и последовательно переигрывает их поверх целевой ветки, создавая линейную историю с абсолютно новыми хэшами SHA-1. В публичных ветках (main / develop) Rebase категорически запрещен, так как переписывает историю коммитов. Это ломает локальные репозитории коллег и требует принудительного `git push --force`.',
        level: 'Middle',
        tags: ['git', 'rebase', 'merge'],
      },
      {
        id: 'linux-q4',
        question: 'Что происходит, когда процесс переходит в состояние Zombie (Z) и как от него избавиться?',
        answer: 'Зомби-процесс (defunct) — это процесс, который завершил свое выполнение, но его родительский процесс еще не прочитал код его завершения через системный вызов `wait()` или `waitpid()`. Зомби не потребляет CPU или RAM, но занимает слот в таблице дескрипторов процессов ядра (PID). Командой `kill -9` убить зомби нельзя (он уже мертв). Избавиться от него можно, послав сигнал SIGCHLD родительскому процессу, либо убив родительский процесс — тогда процесс-зомби будет усыновлен процессом `init` (PID 1), который немедленно вызовет wait() и освободит PID.',
        level: 'Senior',
        tags: ['linux', 'processes', 'zombie', 'kernel'],
      },
      {
        id: 'linux-q5',
        question: 'Как устроен механизм hard link vs soft (symbolic) link на уровне inodes файловой системы?',
        answer: 'Inode хранит метаданные файла (права, размер, адреса блоков данных на диске) и счетчик ссылок (link count). Hard link — это просто дополнительная запись в директории, указывающая на тот же самый номер inode на диске. Данные будут удалены только когда удалятся ВСЕ жесткие ссылки (link count = 0). Жесткую ссылку нельзя создать на директорию или между разными файловыми системами. Soft (symbolic) link — это отдельный специальный файл с собственным inode, содержимое которого — просто текстовая строка с путем к целевому файлу. Если оригинальный файл удалить, симлинк останется висячим («битым»).',
        level: 'Middle',
        tags: ['linux', 'filesystem', 'inodes'],
      },
    ],
  },
  {
    id: 'docker',
    slug: 'docker',
    title: 'Docker & Compose для Дата-Инженеров',
    shortDescription: 'Cgroups, Namespaces, оптимизация слоев Dockerfile, volumes, bridge-сети и поднятие локального стека (Postgres + MinIO + Airflow).',
    level: 5,
    levelTitle: 'Уровень 5: Инфраструктура и Оркестрация',
    engineType: 'cli',
    dependencies: ['linux-git'],
    totalLessons: 7,
    curriculumTopics: [
      'Внутреннее устройство контейнеризации Linux: Namespaces (изоляция PID, Net, Mount) и Cgroups (лимиты CPU/RAM)',
      'Union File System (Overlay2) и физика слоев контейнера',
      'Написание production-ready Dockerfile: Multi-stage сборка, порядок кэширования слоев и запуск без root (non-root user)',
      'Сетевые драйверы Docker: bridge, host, none и резолвинг DNS внутри пользовательской сети',
      'Персистентность данных: Docker Volumes, Bind Mounts и tmpfs',
      'Проверки работоспособности: директива HEALTHCHECK и предотвращение каскадных сбоев',
      'Оркестрация локального дата-стека в docker-compose (Airflow, Postgres, MinIO, ClickHouse)',
    ],
    resumeBulletPoints: [
      'Разработка легковесных multi-stage Docker-образов для ETL-пайплайнов с оптимизацией кэша слоев',
      'Оркестрация локальных сред разработки и тестирования данных на базе Docker Compose',
      'Тюнинг лимитов памяти и CPU (cgroups) для предотвращения падения контейнеров по OOM (Exit code 137)',
      'Настройка изолированных bridge-сетей и безопасного монтирования volumes для СУБД',
    ],
    cheatSheetMarkdown: `### Docker: Шпаргалка инженера

#### 1. Оптимизированный Multi-Stage Dockerfile для Python DE
\`\`\`dockerfile
# Стейдж 1: Сборка зависимостей
FROM python:3.12-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Стейдж 2: Финальный легковесный образ (без компилятора GCC!)
FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /root/.local /root/.local
COPY src/ ./src/
ENV PATH=/root/.local/bin:$PATH
USER 10001:10001
CMD ["python", "src/main.py"]
\`\`\`

#### 2. Диагностика OOM в контейнере
\`\`\`bash
# Код 137 = 128 + 9 (SIGKILL от Linux OOM Killer)
docker inspect my_container --format='{{.State.OOMKilled}}'
\`\`\`

#### 3. Сервисные зависимости с Healthcheck в Compose
\`\`\`yaml
services:
  postgres:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U airflow"]
      interval: 5s
      timeout: 5s
      retries: 5

  airflow-webserver:
    image: apache/airflow:2.9.0
    depends_on:
      postgres:
        condition: service_healthy
\`\`\``,
    interviewQuestions: [
      {
        id: 'docker-q1',
        question: 'Что означает код завершения контейнера 137 (Exit Code 137)?',
        answer: 'Exit Code 137 означает, что процесс внутри контейнера был принудительно завершен сигналом SIGKILL (сигнал номер 9): 128 + 9 = 137. В 99% случаев это работа ядра Linux OOM Killer (Out Of Memory). Контейнер превысил жесткий лимит оперативной памяти (memory limit), заданный в Docker или Kubernetes (cgroups memory.max). Для исправления нужно либо оптимизировать потребление памяти скрипта (генераторы, чанки), либо поднять лимит памяти контейнеру.',
        level: 'Junior',
        tags: ['docker', 'oom', 'exit-codes'],
      },
      {
        id: 'docker-q2',
        question: 'Чем принципиально контейнер Docker отличается от виртуальной машины (KVM/VMware)?',
        answer: 'Виртуальная машина включает в себя полную гостевую операционную систему с собственным ядром (kernel), виртуализацию железа через гипервизор и тяжелый оверхед по памяти и старту (минуты). Контейнер Docker — это просто изолированный процесс в пространстве пользователя, разделяющий единое ядро хостовой ОС (Host Kernel). Изоляция достигается механизмами ядра Linux: Namespaces (видимость сети, процессов, ФС) и Cgroups (ограничение CPU, RAM, I/O). Старт контейнера занимает миллисекунды, а накладные расходы на виртуализацию CPU равны нулю.',
        level: 'Junior',
        tags: ['docker', 'virtualization', 'namespaces'],
      },
      {
        id: 'docker-q3',
        question: 'Зачем нужен Multi-stage сборщик (Multi-stage build) в Dockerfile?',
        answer: 'При компиляции библиотек Python (например, psycopg2, cryptography, polars из исходников) требуются тяжелые пакеты сборки (gcc, g++, make, linux-headers), которые раздувают образ до 1.5 ГБ и несут уязвимости безопасности (CVE). Multi-stage build позволяет в первом промежуточном образе (builder) собрать все колеса (wheels), а в итоговый минимальный образ (runtime) скопировать строго скомпилированные бинарники. Это снижает размер образа в 5-10 раз и исключает компилятор из продуктивного контура.',
        level: 'Middle',
        tags: ['docker', 'multi-stage', 'security'],
      },
      {
        id: 'docker-q4',
        question: 'В чем разница между Docker Volume и Bind Mount?',
        answer: 'Bind Mount монтирует произвольный файл или папку с хостовой машины напрямую в контейнер по абсолютному пути (`/home/user/data:/data`). Он зависит от структуры каталогов конкретной ОС хоста. Docker Volume создается и полностью управляется самим Docker в изолированной системной директории (`/var/lib/docker/volumes/`). Volumes независимы от ОС хоста, безопасны, поддерживают драйверы удаленных хранилищ (NFS, AWS EBS), шифрование и являются рекомендуемым стандартом для баз данных.',
        level: 'Middle',
        tags: ['docker', 'storage', 'volumes'],
      },
      {
        id: 'docker-q5',
        question: 'Как Docker обеспечивает DNS-резолвинг между контейнерами в пользовательской bridge-сети?',
        answer: 'В стандартной сети `default bridge` контейнеры не могут резолвить друг друга по именам (только по IP). Однако в пользовательских сетях (`docker network create` или в сетях Docker Compose) Docker запускает встроенный DNS-сервер на адресе `127.0.0.11`. Демон автоматически регистрирует имя каждого контейнера (и имя сервиса compose) во внутренней DNS-зоне, позволяя сервисам общаться по статическим доменным именам (например, `postgres:5432`).',
        level: 'Senior',
        tags: ['docker', 'networking', 'dns'],
      },
    ],
  },
  {
    id: 'airflow',
    slug: 'airflow',
    title: 'Apache Airflow',
    shortDescription: 'Архитектура Scheduler/Workers, DAG, TaskFlow API, XCom, Sensors (reschedule), Backfill и строго идемпотентные пайплайны.',
    level: 5,
    levelTitle: 'Уровень 5: Инфраструктура и Оркестрация',
    engineType: 'python',
    dependencies: ['python', 'docker'],
    totalLessons: 12,
    curriculumTopics: [
      'Архитектура Apache Airflow: Scheduler, Webserver, MetaDatabase (Postgres), Workers и Queue (Redis/RabbitMQ)',
      'Эволюция исполнителей (Executors): Sequential, Local, CeleryExecutor и KubernetesExecutor',
      'Анатомия DAG: расписание (cron / timetable), logical_date (execution_date) и data_interval',
      'Современный синтаксис TaskFlow API (@dag, @task) против классических операторов',
      'Механизм обмена данными XCom: физика хранения в MetaDB, ограничения по размеру и кастомные XCom Backends (S3/GCS)',
      'Сенсоры (Sensors): катастрофа режима poke (забивание слотов воркеров) и спасительный режим reschedule',
      'Catchup и Backfill: управление историческим пересчетом без обрушения продакшна',
      'Динамическое ветвление и Dynamic Task Mapping (expand) для параллельной обработки списков',
      'Гарантия строгой идемпотентности DAG: атомарный перезапуск партиций за расчетный интервал',
    ],
    resumeBulletPoints: [
      'Проектирование и сопровождение отказоустойчивых кластеров Apache Airflow на базе Celery/KubernetesExecutor',
      'Разработка идемпотентных DAG с использованием современного TaskFlow API и кастомных операторов',
      'Оптимизация пулов воркеров Airflow, перевод сенсоров в режим reschedule с устранением дефицита слотов',
      'Внедрение кастомного XCom-бэкенда на базе S3 для безопасной передачи тяжелых метаданных между тасками',
    ],
    cheatSheetMarkdown: `### Apache Airflow: Шпаргалка инженера

#### 1. Идемпотентный DAG на TaskFlow API
\`\`\`python
from datetime import datetime, timezone
from airflow.decorators import dag, task

@dag(
    schedule_interval="@daily",
    start_date=datetime(2026, 1, 1, tzinfo=timezone.utc),
    catchup=False,
    max_active_runs=1,
    tags=["sales", "core"]
)
def sales_mart_pipeline():

    @task
    def extract(logical_date=None) -> str:
        # logical_date передается автоматически контекстом Airflow!
        target_date = logical_date.to_date_string()
        print(f"Extracting sales for: {target_date}")
        return target_date

    @task
    def load_idempotent(date_str: str):
        # ПРАВИЛО ИДЕМПОТЕНТНОСТИ: Перезапись партиции, а не слепой INSERT!
        sql = f"""
        DELETE FROM marts.sales WHERE sale_date = '{date_str}';
        INSERT INTO marts.sales SELECT * FROM stage.sales WHERE sale_date = '{date_str}';
        """
        print(f"Executing idempotent load: {sql}")

    date_str = extract()
    load_idempotent(date_str)

sales_dag = sales_mart_pipeline()
\`\`\`

#### 2. Режим Сенсоров: poke против reschedule
* ❌ \`mode='poke'\`: Таска удерживает слот воркера все время ожидания. Если файл задерживается на 6 часов, воркер 6 часов висит впустую. 10 сенсоров парализуют весь кластер Airflow!
* ✅ \`mode='reschedule'\`: Сенсор проверяет условие. Если файл не найден, таска освобождает слот воркера, уходит в сон (состояние UP_FOR_RESCHEDULE) и просыпается через \`poke_interval=300\`.`,
    interviewQuestions: [
      {
        id: 'airflow-q1',
        question: 'Что такое logical_date (ранее execution_date) в Airflow и почему он не равен времени реального старта DAG?',
        answer: 'В Airflow logical_date обозначает НАЧАЛО интервала данных (data_interval_start), за который производится расчет. Если DAG настроен на ежедневный запуск (`@daily`), запуск за 2026-10-01 произойдет только в конце суток — 2026-10-02 00:00:00, когда все данные за 1 октября гарантированно собрались. Поэтому реальное время запуска на часах сервера (start_date) всегда опережает logical_date на длину одного интервала расписания.',
        level: 'Junior',
        tags: ['airflow', 'logical-date', 'scheduling'],
      },
      {
        id: 'airflow-q2',
        question: 'Почему передавать Pandas DataFrame через XCom — грубая ошибка и как правильно передавать данные?',
        answer: 'XCom по умолчанию сохраняет данные сериализованными в реляционную мета-базу Airflow (PostgreSQL). Сохранение датафрейма на 500 МБ быстро переполнит shared_buffers и дисковое пространство MetaDB, приведет к зависанию веб-сервера и шедулера. Правильный паттерн: задача 1 сохраняет датафрейм в виде Parquet-файла в объектное хранилище (S3/HDFS), а через XCom возвращает только строковый путь (URI) к этому файлу. Либо настраивается S3/GCS Custom XCom Backend.',
        level: 'Junior',
        tags: ['airflow', 'xcom', 'antipatterns'],
      },
      {
        id: 'airflow-q3',
        question: 'В чем разница между CeleryExecutor и KubernetesExecutor?',
        answer: 'CeleryExecutor держит постоянный фиксированный пул всегда запущенных виртуальных машин-воркеров и очередь задач (Redis/RabbitMQ). Он эффективен при огромном числе мелких и частых тасок (низкий latency старта). KubernetesExecutor на каждую отдельную таску создает отдельный Pod в k8s и удаляет его по завершении. Это дает 100% изоляцию зависимостей (каждая таска может иметь свой Docker-образ), масштабирование до нуля при отсутствии задач, но имеет накладные расходы 10-25 секунд на запуск Pod.',
        level: 'Middle',
        tags: ['airflow', 'executors', 'kubernetes', 'celery'],
      },
      {
        id: 'airflow-q4',
        question: 'Какую опасность несет включенный параметр `catchup=True` при добавлении нового DAG?',
        answer: 'Если новый DAG имеет `start_date` год назад и параметр `catchup=True`, шедулер Airflow мгновенно создаст 365 экземпляров DAG (DagRuns) и попытается запустить их одновременно. Это приведет к лавинообразной перегрузке базы-источника, исчерпанию пула соединений, зависанию шедулера и падению продуктивного кластера. По умолчанию в продакшне всегда выставляют `catchup=False`, а исторический пересчет запускают контролируемо через CLI: `airflow dags backfill`.',
        level: 'Middle',
        tags: ['airflow', 'catchup', 'backfill'],
      },
      {
        id: 'airflow-q5',
        question: 'Как устроен процесс парсинга DAG-файлов планировщиком (DAG File Processing Loop)?',
        answer: 'Scheduler запускает отдельный процесс DagFileProcessorManager, который циклически сканирует папку dags/ и исполняет каждый .py файл как стандартный Python-скрипт каждые N секунд (min_file_process_interval). Если на верхнем уровне файла (top-level code) вне функций задач написать тяжелый сетевой вызов (requests.get или подключение к СУБД), этот вызов будет долбить сервис каждые 30 секунд от каждого ядра шедулера. Поэтому на верхнем уровне DAG запрещены любые тяжелые операции кроме объявления зависимостей.',
        level: 'Senior',
        tags: ['airflow', 'scheduler', 'top-level-code', 'performance'],
      },
    ],
  },
  {
    id: 'dbt',
    slug: 'dbt',
    title: 'dbt & Data Quality',
    shortDescription: 'Материализации (incremental, view, table), макросы Jinja, версионирование снимков (SCD2) и паттерн Write-Audit-Publish.',
    level: 5,
    levelTitle: 'Уровень 5: Инфраструктура и Оркестрация',
    engineType: 'sql',
    dependencies: ['sql', 'dwh'],
    totalLessons: 10,
    curriculumTopics: [
      'Философия dbt (data build tool): Data Analytics as Software Engineering (контроль версий, тесты, документация)',
      'Материализации dbt: view, table, ephemeral и мощная incremental',
      'Инкрементальные стратегии обновления: append, delete+insert, merge (по unique_key)',
      'Шаблонизация Jinja: переменные, условия, циклы и создание переиспользуемых макросов',
      'Автоматическое версионирование истории SCD2: dbt snapshots (стратегии check и timestamp)',
      'Контроль качества данных (Data Quality): generic тесты (unique, not_null, relationships, accepted_values) и singular тесты',
      'Паттерн надежности WAP: Write-Audit-Publish и сине-зеленый деплой витрин данных',
      'Построение графа происхождения данных (Data Lineage) и dbt Docs',
    ],
    resumeBulletPoints: [
      'Построение слоя аналитических трансформаций на dbt Core с инкрементальными стратегиями обновления',
      'Автоматизация отслеживания изменений размерных сущностей (SCD Type 2) с помощью dbt snapshots',
      'Внедрение сквозного тестирования качества данных (Data Quality checks) на всех этапах пайплайна',
      'Разработка переиспользуемых Jinja-макросов для стандартизации SQL-кода в хранилище',
    ],
    cheatSheetMarkdown: `### dbt & Data Quality: Шпаргалка инженера

#### 1. Конфигурация инкрементальной модели dbt
\`\`\`sql
{{
  config(
    materialized = 'incremental',
    unique_key = 'order_id',
    incremental_strategy = 'merge',
    on_schema_change = 'sync_all_columns'
  )
}}

SELECT
    order_id,
    customer_id,
    order_status,
    total_amount,
    updated_at
FROM {{ source('raw_store', 'orders') }}

{% if is_incremental() %}
    -- Фильтр применяется строго при инкрементальном прогоне:
    WHERE updated_at >= (SELECT MAX(updated_at) FROM {{ this }}) - INTERVAL '3 days'
{% endif %}
\`\`\`

#### 2. SCD2 Snapshot в dbt
\`\`\`sql
{% snapshot customers_snapshot %}
{{
    config(
      target_schema='snapshots',
      unique_key='customer_id',
      strategy='timestamp',
      updated_at='updated_at',
    )
}}

SELECT * FROM {{ source('crm', 'customers') }}
{% endsnapshot %}
\`\`\``,
    interviewQuestions: [
      {
        id: 'dbt-q1',
        question: 'Как работает макрос `is_incremental()` в dbt при первом и последующих запусках?',
        answer: 'Макрос `is_incremental()` возвращает `TRUE` только тогда, когда выполняются 3 условия одновременно: 1) модель настроена как `materialized=\'incremental\'`, 2) целевая таблица уже физически существует в СУБД, 3) запуск выполняется без флага `--full-refresh`. При первом запуске dbt создает полную таблицу (`CREATE TABLE AS SELECT`), пропуская блок фильтра. При повторных запусках блок `WHERE updated_at > ...` активируется, отбирая только свежие дельты данных.',
        level: 'Junior',
        tags: ['dbt', 'incremental', 'materializations'],
      },
      {
        id: 'dbt-q2',
        question: 'В чем разница между инкрементальными стратегиями `delete+insert` и `merge`?',
        answer: 'Стратегия `merge` использует SQL-конструкцию `MERGE INTO`, которая за один проход сопоставляет ключи, обновляет изменившиеся строки и вставляет новые. Однако не все СУБД поддерживают эффективный MERGE (или блокируют таблицы). Стратегия `delete+insert` состоит из двух шагов: сначала из целевой таблицы удаляются все строки, чьи `unique_key` присутствуют во входящем инкременте (`DELETE FROM target WHERE key IN (SELECT key FROM stage)`), а затем выполняется чистый `INSERT INTO`. Это обеспечивает максимальную надежность и идемпотентность.',
        level: 'Middle',
        tags: ['dbt', 'merge', 'sql-strategies'],
      },
      {
        id: 'dbt-q3',
        question: 'Что такое ephemeral материализация в dbt и когда она полезна?',
        answer: 'Ephemeral модель физически не создается в базе данных (нет ни таблицы, ни view). При компиляции dbt просто интерполирует ее SQL-код как Common Table Expression (CTE) внутрь зависимых моделей. Это полезно для легковесных промежуточных преобразований и очисток, чтобы не засорять схему базы данных сотнями ненужных технических представлений.',
        level: 'Junior',
        tags: ['dbt', 'ephemeral', 'cte'],
      },
      {
        id: 'dbt-q4',
        question: 'Как устроен паттерн Write-Audit-Publish (WAP) в пайплайнах данных?',
        answer: 'Паттерн WAP предотвращает попадание некорректных данных на дашборды бизнеса: 1) Write: данные трансформации записываются во временную таблицу или скрытую staging-партицию (ветку озера данных). 2) Audit: автоматические тесты качества данных (проверка на отсутствие дублей, полноту, допустимые интервалы сумм). 3) Publish: если все тесты прошли успешно — данные мгновенно переключаются в продуктивную таблицу (через атомарный SWAP таблиц или переключение симлинка). Если хотя бы один тест упал — транзакция откатывается, а бизнес продолжает видеть старую согласованную версию.',
        level: 'Senior',
        tags: ['dbt', 'data-quality', 'wap-pattern'],
      },
      {
        id: 'dbt-q5',
        question: 'Как dbt snapshot определяет изменения при стратегиях `check` и `timestamp`?',
        answer: 'Стратегия `timestamp` требует наличия в источнике надежной колонки `updated_at`. Снапшот просто сравнивает timestamp источника со значением в снапшоте: если время новее, старая запись закрывается (`dbt_valid_to = now`), и создается новая. Стратегия `check` используется, когда в источнике нет временных меток. dbt сравнивает хэш или значения указанного списка колонок (`check_cols: [\'status\', \'address\']`): если хотя бы одно значение изменилось, генерируется новая историческая строка.',
        level: 'Middle',
        tags: ['dbt', 'snapshots', 'scd2'],
      },
    ],
  },
];
