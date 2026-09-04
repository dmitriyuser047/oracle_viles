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

`server.js` пока остается главным файлом приложения и содержит сборку оракульного ответа, но инфраструктурные части уже вынесены:

- `src/config.js` — загрузка `.env`, пути, порт, модели и ключи провайдеров.
- `src/ai/providers.js` — Claude, Groq, порядок fallback и prompt caching для Claude.
- `src/ai/usage.js` — нормализация usage, расчет стоимости, журнал токенов и `/api/usage-stats`.
- `src/oracle/prompts.js` — главный prompt, режимные prompts и лимиты `max_tokens`.

Следующий безопасный этап — вынести из `server.js` очистку ответов, selection knowledge и сборку payload для `/api/oracle`, не меняя API `/api/oracle`, `/api/usage-stats` и `/health`.
