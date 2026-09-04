# Архитектура Велеса

## Клиент

`index.html` теперь отвечает только за разметку экранов и порядок подключения ассетов.

CSS разделен на слои:

- `assets/css/base.css` — базовые переменные, фон, контейнер приложения, общая типографика.
- `assets/css/components.css` — компоненты экранов: чат, дневник, профиль, связи, матрица, формы.
- `assets/css/theme-midnight.css` — текущая визуальная тема Midnight Ice.

JS разделен по зонам ответственности:

- `assets/js/01-state-storage.js` — глобальное состояние, localStorage, сброс профиля.
- `assets/js/02-esoteric-core.js` — расчеты знаков, чисел, рун, чакр, тотемов и профиля.
- `assets/js/03-profile-bonds.js` — расчет и отрисовка связей между людьми.
- `assets/js/04-oracle-symbols.js` — карта дня, таро, матрица, прогноз и вспомогательные символы.
- `assets/js/05-profile-render.js` — построение профиля и интерактивных строк.
- `assets/js/06-chat-oracle.js` — режимы чата, память диалога, запросы к AI.
- `assets/js/07-diary-share-nav.js` — дневник, архивы чатов, шаринг и навигация.

Файлы подключаются обычными `<script>` в строгом порядке, чтобы не ломать текущие inline-обработчики. Следующий шаг — постепенно убрать inline `onclick` и перейти к явным обработчикам событий.

## Сервер

`server.js` теперь остается короткой точкой запуска приложения, а оракульная логика разнесена по серверным модулям:

- `src/config.js` — загрузка `.env`, пути, порт, модели и ключи провайдеров.
- `src/ai/providers.js` — Claude, Groq, порядок fallback и prompt caching для Claude.
- `src/ai/usage.js` — нормализация usage, расчет стоимости, журнал токенов и `/api/usage-stats`.
- `src/oracle/prompts.js` — главный prompt, режимные prompts и лимиты `max_tokens`.
- `src/oracle/sanitizers.js` — очистка Markdown, внешних ссылок, смешения традиций, лунных вставок и финальная полировка ответа.
- `src/oracle/prompt-utils.js` — безопасное сжатие событий и памяти чата перед отправкой в AI.
- `src/oracle/knowledge.js` — выбор релевантных knowledge-блоков без fallback “первые N элементов”.
- `src/oracle/safety.js` — мягкое распознавание кризисных и тревожных сигналов без диагнозов в ответе.
- `src/oracle/formatters.js` — форматирование профиля, матрицы, расклада, связи и рунического кода для prompt.
- `src/oracle/payload.js` — сборка компактного `userMessage` для AI.
- `src/oracle/reply-pipeline.js` — единая цепочка нормализации и очистки ответа.
- `src/routes/oracle.js` — HTTP endpoint `/api/oracle`, вызов AI и запись usage.

`server.js` теперь остается точкой сборки Express: middleware, статические файлы, health, usage route, oracle route и запуск порта. API `/api/oracle`, `/api/usage-stats` и `/health` сохранены.
