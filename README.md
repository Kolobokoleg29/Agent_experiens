🎮 Agent for Phaser
https://img.shields.io/badge/node-%253E%253D18-brightgreen
https://img.shields.io/badge/License-MIT-blue.svg
https://img.shields.io/badge/TypeScript-5.0-blue
https://img.shields.io/badge/OpenRouter-API-orange

🤖 Мультиагентная система для автоматической генерации 2D-игр на Phaser 3 под платформу Яндекс.Игры

📖 Описание
Agent for Phaser — это конвейер AI-агентов, который превращает минимальное описание игры в рабочий прототип на Phaser 3 (TypeScript) с интеграцией платформы Яндекс.Игр.

Система автоматически:

Анализирует рынок Яндекс.Игр (тренды, насыщенные ниши, голубые океаны)

Находит перспективные ниши для казуальных/мидкорных игр

Генерирует уникальную концепцию игры

Проверяет концепцию по 6 критериям (уникальность, реализуемость, удержание, монетизация, модерация, спрос)

Создаёт детальный Game Design Document (GDD)

Пишет рабочий код на Phaser 3 + TypeScript

Проводит ревью кода через TypeScript Compiler API

Автоматически исправляет ошибки

✨ Ключевые возможности
🧠 Мультиагентная архитектура — каждый этап выполняется специализированным ИИ-агентом

🔄 Автоматическое восстановление — чекпоинты после каждого этапа, возобновление после сбоя

💾 Экономия токенов — кеширование ответов, детерминированные проверки вместо LLM

🎯 Human-in-the-Loop — утверждение концепции перед генерацией кода

🔧 Супер-надёжный парсер JSON — справляется с любыми "грязными" ответами LLM (ёлочки, управляющие символы, обрезанные ответы)

🔑 Ротация ключей — автоматическое переключение между API-ключами при исчерпании лимитов

📊 Детерминированная валидация кода — TypeScript Compiler API вместо LLM

🎮 Готовность к Яндекс.Играм — интеграция с YSdk, мобильная адаптация, монетизация

🏗️ Архитектура
text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLI (src/cli.ts)                                 │
│                         Интерактивный выбор режима                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Pipeline (src/pipeline.ts)                         │
│                     Оркестратор, чекпоинты, контекст                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Stages (src/stages/)                              │
│  Market → Niche → NicheSelection → Concept → Validation → VerdictGate →     │
│  Approval → Design → Code → Review → ProjectWriter                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Agents (src/agents/)                              │
│   MarketAnalyst → NicheHunter → ConceptAgent → ConceptValidator →          │
│   GameArchitect → EconomyAgent → ProductionAgent → CodeAgent → ReviewAgent   │
│   SupervisorAgent — подключён как SupervisorStage в 3 контрольных точках    │
│   (после валидации концепции, после GDD, после кода); при высоком риске     │
│   жёстко останавливает пайплайн                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Core (src/core/)                                  │
│  OpenRouterClient │ TavilyClient │ TokenTracker │ Heartbeat │ Cache │        │
│  ModelRouter │ rate-limit.ts                                                │
└─────────────────────────────────────────────────────────────────────────────┘
🚀 Быстрый старт
Требования
Node.js 18+

npm или yarn

API-ключи:

OpenRouter — для доступа к LLM (можно бесплатные модели)

Tavily — для веб-поиска (опционально)

Установка
bash
# Клонируем репозиторий
git clone https://github.com/Kolobokoleg29/Agent_for_phaser.git
cd Agent_for_phaser

# Устанавливаем зависимости
npm install
Настройка окружения
Скопируйте пример конфигурации и заполните свои ключи:

bash
cp .env.example .env
Отредактируйте .env:

env
# Несколько ключей через запятую (для ротации при лимитах)
OPENROUTER_API_KEYS=sk-or-v1-ключ1,sk-or-v1-ключ2,sk-or-v1-ключ3

# Опционально: для веб-поиска
TAVILY_API_KEY=ваш_ключ_здесь
Запуск
bash
# Полный анализ рынка + генерация игры
npm run pipeline

# Просмотр использования API (счётчик запросов)
npm run usage

# Список бесплатных моделей OpenRouter
npm run models:list

# Проверка конкретной модели
npm run test:model <model-id>
📚 Подробное описание этапов
Этап	Агент	Что делает	Результат
1. Market	MarketAnalyst	Анализирует Яндекс.Игры (тренды, насыщенные жанры, свободные ниши)	context.market
2. Niche	NicheHunter	Находит 5-7 перспективных ниш (метод «голубого океана»)	context.niches
2.5. Niche Selection	—	Детерминированно выбирает одну нишу из найденных (по максимуму monetizationPotential - complexity среди ниш с complexity ≤ 6)	context.selectedNiche
3. Concept	ConceptAgent	Генерирует концепцию 2D-игры под выбранную нишу	context.concept
4. Validation	ConceptValidator	Проверяет концепцию по 6 критериям (1-10)	context.validation
4.5. Verdict Gate	—	Если вердикт rejected/needs_work — автоматически перегенерирует концепцию (до 3 попыток) с учётом замечаний валидатора, прежде чем показать её человеку	context.retryCount
5. Approval	ApprovalStage	Запрашивает подтверждение у человека (Human-in-the-Loop)	context.metrics.approval
6. Design	GameArchitect	Создаёт детальный Game Design Document	context.gdd
7. Code	CodeAgent	Генерирует полный код на Phaser 3 + TypeScript	context.code
8. Review	ReviewAgent	Ревью кода через TypeScript Compiler API + автофикс (до 3 попыток)	context.review
9. Project Writer	—	Детерминированно (без LLM) записывает context.code.files на диск как реальный Vite-проект (output/games/<slug>/) + статический boilerplate (package.json/vite.config.ts/tsconfig.json/index.html с YSDK)	context.projectPath
🤖 Агенты
1. MarketAnalyst (src/agents/market-analyst.ts)
Собирает и анализирует данные о платформе Яндекс.Игры:

MAU, каталог, рост IAP

Тренды, насыщенные жанры, свободные ниши

2. NicheHunter (src/agents/niche-hunter.ts)
Находит перспективные ниши по методу «голубого океана»:

Зарождение (1-2 игры)

Нет волны клонов

Потенциал монетизации

3. ConceptAgent (src/agents/concept-agent.ts)
Генерирует концепцию 2D-игры:

Название, жанр, описание

Уникальность, механика, удержание

Целевая аудитория, монетизация

4. ConceptValidator (src/agents/concept-validator.ts)
Оценивает концепцию по 6 критериям:

Уникальность, реализуемость, удержание

Монетизация, модерация, спрос

Вердикт: approved / needs_work / rejected

5. GameArchitect (src/agents/game-architect.ts)
Создаёт детальный GDD:

Уникальность, целевая аудитория

Игровой цикл, монетизация

Техническая архитектура на Phaser 3

MVP-фичи, риски

6. CodeAgent (src/agents/code-agent.ts)
Генерирует код на Phaser 3 + TypeScript:

Все сцены (Boot, Menu, Game, UI, Result)

Классы сущностей

Интеграция с YSdk

Проверка через TypeScript Compiler API

7. ReviewAgent (src/agents/review-agent.ts)
Ревью и автофикс кода:

Детерминированная проверка через TypeScript

Исправление ошибок через LLM (если нужно)

Повторная проверка

8. SupervisorAgent (src/agents/supervisor-agent.ts)
Подключён к пайплайну через SupervisorStage в трёх точках: после валидации концепции, после генерации GDD, после генерации кода. Работает детерминированно, без LLM-вызовов:

Проверка концепции, GDD, кода по формальным правилам (обязательные разделы, кол-во MVP-фич, наличие Yandex SDK и т.п.)

Проверка на нереализуемые на платформе технологии (голосовой чат/WebRTC, доступ к камере/микрофону, интеграции с Discord/Telegram, крипто-платежи, USSD, push-уведомления, нативные клиенты) — при обнаружении принудительно ставится riskLevel "high"

При riskLevel "high" пайплайн жёстко останавливается (throw), при medium/low — только предупреждение в context.warnings

🔧 Управление лимитами и экономия токенов
Ротация API-ключей
Поддерживается несколько ключей через OPENROUTER_API_KEYS (через запятую)

При ошибке 429 или 401 автоматически переключается на следующий ключ

Заблокированные ключи сохраняются в key-status.json до сброса лимита

Ротация моделей
При недоступности модели (404) или исчерпании лимита переключается на fallback

Список fallback-моделей настраивается в конструкторе OpenRouterClient

Кеширование
Ответы моделей кешируются на основе sha256(prompt + model + temperature)

Кеш хранится в папке cache/

Автоматическая очистка устаревших записей (7 дней)

Детерминированные проверки
Синтаксис TypeScript проверяется через ts.transpileModule (не LLM)

Правила модерации — чек-лист с регулярными выражениями

Это экономит до 70% токенов

Супер-надёжный парсер JSON
Единая функция parseJsonWithRecovery (src/tools/json-cleaner.ts), используется во всех 7 агентах вместо ранее задублированного кода:

Замена ёлочек на кавычки

Экранирование управляющих символов

Извлечение JSON-блока через регулярное выражение

Обрезание до последней закрывающей скобки

Многослойное восстановление

Каждый результат дополнительно проверяется Zod-схемой (src/schemas.ts) — если ответ модели не соответствует ожидаемой структуре, это будет явной ошибкой, а не тихим прохождением с пустыми полями.

Материализация кода на диск (ProjectWriterStage)
Раньше сгенерированный код так и оставался JSON-объектом ({files: [{path, content}]}) внутри чекпоинта и output/6-code.json — реального дерева файлов проекта нигде не появлялось. ProjectWriterStage (src/stages/project-writer-stage.ts + src/tools/project-writer.ts) — детерминированный шаг без LLM-вызовов, который запускается после ReviewStage и:

Пишет каждый файл из context.code.files на диск в output/games/<slug-игры>/, где slug — транслитерированное и слагифицированное название концепции

Санитизирует путь каждого файла (sanitizeRelativePath) — защита от path traversal и абсолютных путей, так как path приходит из ответа модели, а не от доверенного источника; небезопасные файлы пропускаются и попадают в context.warnings, а не пишутся куда попало

Определяет entry point игры (detectEntryFile) — ищет файл с реальным new Phaser.Game(...), а не угадывает по имени; если не найден — предупреждение в context.warnings

Добавляет статический Vite-boilerplate, который не генерируется LLM заново на каждый прогон: package.json (зависимость phaser ^3.90.0), vite.config.ts (base: './' для Яндекс Игр), tsconfig.json, index.html с тегом Yandex Games SDK и ссылкой на найденный entry point, .gitignore, assets/README.md

Результат — context.projectPath, откуда сразу можно npm install && npm run build в самом output/games/<slug>/

Известные ограничения по-прежнему в силе: ProjectWriterStage не генерирует и не подкладывает сами ассеты (спрайты/звуки) — см. пункт про AssetAgent ниже; собранный проект по-прежнему не запустится без них.

📁 Структура проекта
text
agent-tools/
├── src/
│   ├── agents/                  # AI-агенты
│   │   ├── base-agent.ts        # Базовый класс (зависит от ILLMClient/ISearchClient)
│   │   ├── market-analyst.ts    # Анализ рынка
│   │   ├── niche-hunter.ts      # Поиск ниш
│   │   ├── concept-agent.ts     # Генерация концепции
│   │   ├── concept-validator.ts # Валидация концепции
│   │   ├── game-architect.ts    # Генерация GDD
│   │   ├── code-agent.ts        # Генерация кода
│   │   ├── review-agent.ts      # Ревью кода (с циклом автофикса)
│   │   └── supervisor-agent.ts  # Контроль качества, подключён в 3 точках пайплайна
│   ├── stages/                  # Этапы пайплайна
│   │   ├── base-stage.ts
│   │   ├── market-stage.ts
│   │   ├── niche-stage.ts
│   │   ├── niche-selection-stage.ts  # Выбор ниши (P0-3)
│   │   ├── concept-stage.ts
│   │   ├── validation-stage.ts
│   │   ├── verdict-gate-stage.ts     # Авто-ретрай при rejected/needs_work (P1-5)
│   │   ├── approval-stage.ts
│   │   ├── design-stage.ts
│   │   ├── code-stage.ts
│   │   ├── review-stage.ts
│   │   └── project-writer-stage.ts   # Запись кода на диск (P0, без LLM)
│   ├── core/                    # Ядро системы
│   │   ├── openrouter-client.ts # Клиент OpenRouter (ротация ключей, кеш, роутинг)
│   │   ├── tavily-client.ts     # Клиент Tavily
│   │   ├── token-tracker.ts     # Треккинг запросов и токенов
│   │   ├── cache.ts             # Кеш ответов моделей
│   │   ├── model-router.ts      # Дефолты temperature/maxTokens по типу задачи
│   │   ├── rate-limit.ts        # Нормализация x-ratelimit-reset (с верхней границей)
│   │   ├── interfaces.ts        # ILLMClient / ISearchClient
│   │   └── heartbeat.ts         # Индикатор активности
│   ├── services/                # Сервисы
│   │   └── retry.service.ts     # Централизованные ретраи
│   ├── tools/                   # Инструменты
│   │   ├── json-cleaner.ts      # Супер-надёжный парсер JSON (parseJsonWithRecovery)
│   │   ├── code-validator.ts    # Проверка TypeScript через Compiler API
│   │   ├── prompt-builder.ts    # Построение промптов
│   │   ├── sanitize.ts          # Обёртка внешнего контента (защита от prompt injection)
│   │   └── project-writer.ts    # Запись GameCode.files на диск + boilerplate (без LLM)
│   ├── schemas.ts                # Zod-схемы DTO (единый источник истины для типов)
│   ├── pipeline.ts              # Оркестратор
│   ├── cli.ts                   # Интерфейс командной строки
│   ├── index.ts                 # Точка входа
│   └── types.ts                 # Типы (реэкспорт из schemas.ts + ReviewResult/PipelineContext)
├── tests/                       # Юнит-тесты (node:test)
│   ├── retry.service.test.ts
│   ├── json-cleaner.test.ts
│   ├── rate-limit.test.ts
│   ├── code-validator.test.ts
│   └── project-writer.test.ts
├── output/                      # Результаты работы
│   ├── 1-market-data.json
│   ├── 2-niches.json
│   ├── 3-concept-*.json
│   ├── 4-validation-*.json
│   ├── 5-gdd.json
│   ├── 6-code.json
│   ├── 7-review.json
│   ├── checkpoint-*.json        # Чекпоинты для возобновления
│   └── games/<slug>/            # Реальные файлы игры, записанные ProjectWriterStage
├── cache/                       # Кеш ответов моделей (создаётся автоматически)
├── .env.example                 # Пример переменных окружения
├── package.json
├── tsconfig.json
└── README.md
🛠️ Команды
Команда	Описание
npm run pipeline	Запуск полного пайплайна (анализ → ниши → концепция → валидация → GDD → код → ревью)
npm run usage	Просмотр количества запросов и токенов, использованных сегодня
npm run models:list	Список всех бесплатных моделей OpenRouter
npm run test:model <id>	Проверка конкретной модели
npm run build	Сборка TypeScript
npm run dev	Запуск в режиме разработки (watch)
npm run typecheck	Проверка типов без сборки (tsc --noEmit)
npm test	Запуск юнит-тестов (tests/*.test.ts, node:test)
⚠️ Известные ограничения
Осознанно не реализовано в текущей версии (см. отчёт об аудите для деталей):

Нет circuit breaker при полной недоступности OpenRouter (перебор всех ключей/моделей происходит последовательно до конца списка).

Нет AssetAgent — GameCode.files не содержит реальных спрайтов/звуков, только код; сгенерированный проект не запустится без плейсхолдер-ассетов.

Нет прямого fallback-провайдера (например, OpenAI/Anthropic API напрямую) при полном отказе OpenRouter.

Быстрый режим (Pipeline.run(), команда для однократной быстрой генерации) генерирует код даже если концепция не прошла валидацию (verdict !== 'approved') — единственная защита в этом режиме - SupervisorStage после концепции (останавливает только при riskLevel "high"). Полный режим (runFullResearch()) строже: там работает Verdict Gate с авторетраем.

moderation-checklist.md — опциональный файл в корне проекта. Если он существует, ConceptValidator использует его как источник истины для оценки модерационной безопасности; если его нет — валидатор оценивает по общим знаниям и явно помечает это в risks. Шаблон файла уже добавлен, но пока не заполнен реальным чек-листом.

🤝 Вклад в проект
Мы открыты для улучшений! Если у вас есть идеи, баг-репорты или пул-реквесты — не стесняйтесь.

Форкните репозиторий

Создайте ветку для вашей фичи (git checkout -b feature/amazing-feature)

Внесите изменения и протестируйте их

Сделайте коммит и пуш

Откройте Pull Request

Рекомендации:

Следуйте стилю кода (ESLint настроен)

Добавляйте тесты для новых модулей

Документируйте публичные API и сложные участки

📄 Лицензия
Проект распространяется под лицензией MIT — подробности в файле LICENSE.

🌟 Благодарности
OpenRouter — доступ к множеству LLM-моделей

Tavily — API для веб-поиска

Phaser — игровой движок

Сообществу Яндекс.Игр за платформу и документацию

📬 Контакты
Создатель: Kolobokoleg29
По вопросам сотрудничества или предложениям — создавайте Issue на GitHub.

⭐ Если проект вам полезен, поставьте звёздочку на GitHub — это помогает нам двигаться дальше!