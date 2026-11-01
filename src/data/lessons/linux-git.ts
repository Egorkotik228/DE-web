import { Lesson } from '@/types/course';

export const linuxGitLessons: Lesson[] = [
  {
    id: 'linux-pipelines',
    moduleSlug: 'linux-git',
    order: 1,
    title: 'Пайпы Linux, потоки ввода-вывода и обработка логов через grep/awk',
    estimatedMinutes: 30,
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Философия Unix: Всё есть файл и потоковая обработка

В основе дата-инженерии лежит философия Unix, сформулированная Кеном Томпсоном и Дугом Макилроем:
> *«Пишите программы, которые делают одну вещь и делают её хорошо. Пишите программы, которые работают вместе. Пишите программы, которые поддерживают текстовые потоки, потому что это универсальный интерфейс.»*

#### Стандартные потоки ввода-вывода (File Descriptors)
Каждый процесс в Linux при запуске открывает три стандартных дескриптора:
- **\`0\` (stdin):** стандартный ввод (по умолчанию с клавиатуры).
- **\`1\` (stdout):** стандартный вывод (по умолчанию в терминал).
- **\`2\` (stderr):** стандартный поток ошибок (выводится в консоль независимо от stdout).

Символ пайпа (\`|\`) соединяет \`stdout\` левой программы со \`stdin\` правой программы без промежуточной записи на диск:
\`\`\`bash
cat /var/log/nginx/access.log | grep " 500 " | awk '{print $1}' | sort | uniq -c | sort -nr
\`\`\`
Этот пайплайн в оперативной памяти находит IP-адреса, вызвавшие больше всего 500-х ошибок.`,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Конвейер завода Ford',
        content:
          'Пайплайн Linux похож на конвейер: один рабочий обрезает деталь (grep фильтрует строки), второй шлифует (awk вырезает нужную колонку), третий клеит этикетку (sort). Никто не складывает детали на промежуточный склад — продукт передается из рук в руки потоком.',
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Бесконечные логи без ротации (Disk Full)',
        content:
          'Запуск скрипта через \`python main.py > output.log 2>&1\` без \`logrotate\` за месяц забьет весь диск сервера. Всегда используйте ротацию логов или пишите в stdout контейнера Docker.',
      },
    ],
    glossaryTerms: [
      { term: 'File Descriptor', definition: 'Неотрицательное целое число, используемое ядром ОС для идентификации открытого файла или сетевого сокета процесса.' },
      { term: 'Pipe (|)', definition: 'Механизм межпроцессного взаимодействия (IPC), перенаправляющий поток вывода одного процесса во ввод другого.' },
      { term: 'awk', definition: 'Тьюринг-полный язык обработки структурированного текста с автоматическим разделением строк на колонки ($1, $2, ...).' },
    ],
    schemaPreview: [
      {
        tableName: 'virtual_filesystem',
        columns: [
          { name: 'path', type: 'VARCHAR(255)' },
          { name: 'permissions', type: 'VARCHAR(10)' },
          { name: 'owner', type: 'VARCHAR(32)' },
        ],
        sampleRows: [
          { path: '~/project/orders.csv', permissions: '-rw-r--r--', owner: 'dataeng' },
          { path: '~/project/pipeline.sh', permissions: '-rwxr-xr-x', owner: 'dataeng' },
        ],
      },
    ],
    taskDescription:
      'В интерактивном терминале изучите содержимое текущей директории с помощью `ls -la`, найдите в файле `orders.csv` все строки со статусом `SUCCESS` с помощью утилиты `grep SUCCESS orders.csv`, и создайте новую ветку git с помощью `git checkout -b feature/data-clean`. Нажмите «Проверить решение» после выполнения.',
    seedCode: '',
    initialCode: 'ls -la',
    solutionCode: 'grep SUCCESS orders.csv',
    testConfig: {
      checkOrder: false,
      floatPrecision: 2,
      requiredAstPatterns: ['ls', 'grep', 'git'],
    },
    brokenProdTask: {
      title: 'Авария: Заблокированный рабочий процесс',
      incidentDescription:
        'P1 Incident: Cron-скрипт упал с ошибкой «Permission denied: ./pipeline.sh». Требуется выдать права на исполнение файлу.',
      buggyCode: 'bash: ./pipeline.sh: Permission denied',
      fixHint: 'Используйте команду chmod +x pipeline.sh, чтобы предоставить права на запуск.',
      solutionCode: 'chmod +x pipeline.sh',
      testConfig: { checkOrder: false, floatPrecision: 2 },
    },
    hints: [
      'Выполните команду «ls -la», чтобы просмотреть права файлов.',
      'Выполните «grep SUCCESS orders.csv» для фильтрации успешных заказов.',
      'Создайте ветку командой «git checkout -b feature/data-clean».',
    ],
  },
];
