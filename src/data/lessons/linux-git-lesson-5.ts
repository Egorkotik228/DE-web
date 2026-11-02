import { Lesson } from '@/types/course';

export const linuxGitLesson5: Lesson = {
  "id": "linux-git-5",
  "moduleSlug": "linux-git",
  "order": 5,
  "title": "Git для командной разработки: ветвления, разрешение конфликтов, rebase vs merge и git reflog",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Interactive Rebase (git rebase -i)",
      "definition": "Инструмент переписывания локальной истории коммитов перед отправкой в общий репозиторий (squash для объединения, reword для редактирования сообщений, fixup)."
    },
    {
      "term": "Fast-Forward Merge",
      "definition": "Слияние веток без создания дополнительного merge-коммита, при котором указатель целевой ветки просто передвигается вперед по линейной истории."
    },
    {
      "term": "git reflog (Reference Log)",
      "definition": "Журнал локальных перемещений указателя HEAD, позволяющий восстановить случайно удаленные коммиты, ветки или последствия неудачного rebase/reset --hard."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "git_branch_log",
      "description": "История веток и коммитов в аналитическом репозитории",
      "columns": [
        {
          "name": "commit_hash",
          "type": "CHAR(40)",
          "keyType": "PK"
        },
        {
          "name": "branch_name",
          "type": "VARCHAR(64)",
          
        },
        {
          "name": "message",
          "type": "VARCHAR(128)",
          
        },
        {
          "name": "author",
          "type": "VARCHAR(64)",
          
        }
      ],
      "sampleRows": [
        {
          "commit_hash": "c1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4",
          "branch_name": "main",
          "message": "feat(dbt): add dim_customers model",
          "author": "senior_de"
        },
        {
          "commit_hash": "a9b8c7d6e5f40312918273645a4b3c2d1e0f9a8b",
          "branch_name": "feature/sal",
          "message": "fix: resolve same-as-link hashing",
          "author": "junior_de"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Профессиональная работа с Git в дата-командах\n\nВ дата-инженерии код репозитория напрямую управляет производственной базой: миграции таблиц (Liquibase, Flyway), dbt-модели, Airflow DAG'и. Хаос в коммитах или некорректный merge могут сломать продакшн-пайплайн всей компании.\n\n#### 1. Merge против Rebase: когда что выбирать\n* **`git merge`**: сохраняет историческую достоверность, создавая merge-коммит с двумя родителями. Минус: ветвистое «дерево спагетти», где тяжело искать источник регрессии через `git bisect`.\n* **`git rebase origin/main`**: переносит ваши локальные коммиты на верхушку актуальной ветки `main`, создавая чистую линейную историю. **Золотое правило:** никогда не делать rebase веток, опубликованных в общий доступ (shared branches)!\n\n#### 2. Интерактивный Rebase: этика чистого Pull Request\nПеред открытием PR в `main` объединяйте мусорные коммиты («fix typo», «test bug», «wip»):\n```bash\ngit rebase -i HEAD~3\n# pick c1a2b3 feat: add clickhouse engine\n# squash a9b8c7 fix: typo in port\n# squash e2f3a4 fix: syntax in docker\n```\n\n#### 3. Спасательный круг: `git reflog`\nЕсли вы случайно выполнили `git reset --hard` и потеряли неделю работы — Git ничего не удаляет сразу! Указатель HEAD логирует все перемещения:\n```bash\ngit reflog\n# Находим нужный хеш до сброса: HEAD@{2}\ngit reset --hard HEAD@{2}\n```"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Черновик книги и чистовик",
      "content": "Интерактивный rebase squash — это редактура черновика перед сдачей в печать. Читателю книги не нужно видеть, сколько опечаток вы сделали, сколько чашек кофе пролили и сколько раз сохраняли файл. Читателю нужен один чистый, логичный финальный том."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение стратегий интеграции веток",
        "beforeDescription": "Бесконечные случайные коммиты (No-rebase Git flow)",
        "beforeColumns": [
          "git_history_look",
          "git_bisect_debug",
          "code_review_effort"
        ],
        "beforeRows": [
          [
            "Spaghetti branches",
            "Fails on broken WIP",
            "20 micro-commits to read"
          ],
          [
            "Merge conflict commits",
            "Hard to isolate changes",
            "High cognitive load"
          ],
          [
            "Unclean commit messages",
            "Blame shows 'fix bug'",
            "Lost business intent"
          ]
        ],
        "afterDescription": "Линейная история (Squash + Rebase)",
        "afterColumns": [
          "git_history_look",
          "git_bisect_debug",
          "code_review_effort"
        ],
        "afterRows": [
          [
            "Clean linear timeline",
            "Bisect finds bug in 1 sec",
            "Single atomic commit review"
          ],
          [
            "Zero noise in log",
            "Clean cherry-pick support",
            "Easy rollback of features"
          ],
          [
            "Conventional commits",
            "Clear changelog generation",
            "Clear audit history"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: `git push --force` в общую ветку `main`",
      "content": "Инженер сделал локальный rebase и отправил в `main` через `git push --force`. Это переписало историю для всех 20 дата-инженеров команды, затерев чужие влитые коммиты. Защищайте ветку `main` в настройках репозитория (Protected Branch) и используйте только безопасный `--force-with-lease` для персональных feature-веток."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Чем `git fetch` отличается от `git pull`?",
      "content": "**Ответ:** `git fetch` только скачивает новые коммиты и ссылки из удаленного репозитория в локальную базу Git, но не изменяет ваши рабочие файлы и ветки. Команда `git pull` является комбинацией `git fetch` и немедленного `git merge` (или `git rebase` при флаге `--rebase`), что может вызвать неожиданные конфликты в рабочей директории."
    }
  ],
  "taskDescription": "Вам необходимо подготовить ветку фичи 'feature/dbt-mart' к слиянию с основной веткой 'main':\n1. Скачайте свежие изменения из удаленного репозитория без немедленного слияния с помощью 'git fetch origin'.\n2. Перебазируйте текущую ветку на свежую версию 'origin/main' с помощью команды 'git rebase origin/main'.\n3. В случае возникновения конфликта в файле миграции разрешите его вручную, добавьте файл в индекс через 'git add' и продолжите операцию через 'git rebase --continue'.\n\nВведите команду для безопасного обновления локальной ветки через rebase на верхушку удаленного main ('git rebase origin/main').",
  "seedCode": "#!/bin/bash\n# Выполните перебазирование ветки на свежий main\n",
  "initialCode": "git fetch origin && git rebase ...",
  "solutionCode": "git fetch origin && git rebase origin/main",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "git fetch origin",
      "git rebase origin/main"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #605: Уничтожение коммитов коллег при push --force",
    "incidentDescription": "Инженер переписал ветку main через git push --force, стерев 15 коммитов других разработчиков.",
    "buggyCode": "git push --force origin main",
    "fixHint": "Используйте флаг --force-with-lease, который отклонит отправку, если удаленная ветка содержит чужие изменения.",
    "solutionCode": "git push --force-with-lease origin feature-branch",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Сначала обновите ссылки на удаленный репозиторий через `git fetch origin`.",
    "Выполните перебазирование на `origin/main`: `git rebase origin/main`.",
    "Объединенная команда: `git fetch origin && git rebase origin/main`."
  ]
};
