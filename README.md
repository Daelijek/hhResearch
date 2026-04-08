# hhResearch: выгрузка навыков из HH.ru в Excel

## Зачем проект
Проект собирает данные по вакансиям с HH.ru через HH API и заполняет Excel-таблицу:
- `Ключевики` — ключевые фразы, извлечённые из `description` вакансии (текст вакансии).
- `Навыки (инструменты)` — **ключевые навыки HH**, взятые из поля `key_skills` в ответе API.

Дальше вы вручную/фильтрами в Excel находите самые частотные навыки и используете их для адаптации резюме.

## Как работает
1. Скрипт получает список вакансий:
   - режим `auto`: ищет вакансии по поисковым запросам через `GET /vacancies?text=...`
   - режим `manual`: читает `manual_ids.txt` (ID или URL вакансии) и обрабатывает только их
2. Для каждой вакансии делает `GET /vacancies/{id}`
3. Записывает в Excel:
   - `key_skills[*].name` и ключевые фразы из `description` пишутся рядом в одном “блоке” строк
   - `ID` и `Link` заполняются только в первой строке блока
   - если списки разной длины: более короткий столбец дальше остаётся пустым, пока не закончится длинный
4. Результат сохраняется в Excel:
   - для CLI (`hh_keyskills_export.py`) используется `template.xlsx`, и данные **дописываются** ниже последней заполненной строки (сам шаблон не очищается)
   - для HTTP API вы отдаёте пользователю сгенерированный `.xlsx` (это новый файл; `template.xlsx` на бэкенде не используется)

## Требования
- Python 3.10+ (желательно)
- Зависимости (ниже)

Файл шаблона:
- `template.xlsx`
- лист по умолчанию: `Sheet1`
- заголовки должны быть в первой строке:
  - `Vacancy Title` в колонке `A`
  - `Key Words` в колонке `B`
  - `Key Skills (...)` в колонке `C`
  - `ID` в колонке `D`
  - `Link` в колонке `E`

## Важно: порядок колонок в актуальном `template.xlsx`
В текущей версии шаблона порядок такой:
- `Vacancy Title` в колонке `A`
- `Key Words` в колонке `B`
- `Key Skills (...)` в колонке `C`
- `ID` в колонке `D`
- `Link` в колонке `E`

## Установка
1. Откройте терминал в папке проекта: `c:\WorkProject\hhResearch`
2. Установите зависимости:
   ```powershell
   pip install -r requirements.txt
   ```

## Подготовка для режима `manual`
Файл: `manual_ids.txt`

Формат: **каждая вакансия с новой строки**.
Можно писать:
- только ID (число), например `131474430`
- или URL, например `https://hh.ru/vacancy/131474430`

Пример:
```
131474430
131234053
```

## Запуск
### 1) Manual mode (рекомендовано для “лучших” вакансий)
```powershell
python .\hh_keyskills_export.py --mode manual --manual-input .\manual_ids.txt
```

Дополнительно полезно (если нужно увеличить/уменьшить количество “ключевиков”):
```powershell
python .\hh_keyskills_export.py --mode manual --manual-input .\manual_ids.txt --kw-top-n 30 --kw-max-ngram 3
```

### 2) Auto mode (сбор по запросам)
```powershell
python .\hh_keyskills_export.py --mode auto --pages 2
```

По умолчанию используются запросы:
- `frontend разработчик`
- `fullstack разработчик`
- `frontend developer`
- `fullstack developer`

Чтобы поменять запросы:
```powershell
python .\hh_keyskills_export.py --mode auto --queries "React разработчик" "Fullstack" --pages 2
```

## Выходной файл Excel
CLI сохраняет результат как новый файл в папку внутри проекта:
- по умолчанию: `./reports/`
- имя файла: `{out-prefix}_{mode}_filled_YYYYMMDD_HHMMSS.xlsx`

По умолчанию `out-prefix = hh_keyskills`.

Скрипт **не очищает** исходные данные в `template.xlsx` — он дописывает ниже последней заполненной строки (ориентируется на заполненные `Key Words`/`Key Skills` и, на всякий случай, `ID`).

HTTP API при этом возвращает сгенерированный файл `.xlsx` напрямую (streaming в ответе) и **не** модифицирует `template.xlsx`.

## Колонки и соответствие
По умолчанию:
- `A` (колонка `--col-title`, default `1`) = `Vacancy Title`
- `B` (колонка `--col-keywords`, default `2`) = `Key Words`
- `C` (колонка `--col-skills`, default `3`) = `Key Skills (...)`
- `D` (колонка `--col-id`, default `4`) = `ID`
- `E` (колонка `--col-link`, default `5`) = `Link`
- старт записи: `2` строка (после заголовков), параметр `--start-row`

Требование под формат:
- На каждой строке блока (1 строка = 1 индекс внутри списка):
  - в колонке `Key Words` стоит keywords[i] или пусто
  - в колонке `Key Skills` стоит key_skills[i].name или пусто

## Важные параметры
### Для “Ключевики” (из description)
- `--kw-top-n` (default `30`) — сколько фраз извлечь из одной вакансии
- `--kw-max-ngram` (default `3`) — максимум размера фразы в словах (1..3)

Примечание: извлечение “ключевиков” сделано простой частотной эвристикой по n-граммам из текста вакансии. Поэтому возможны шумы — их вы уберёте фильтрами в Excel.

### Для auto режима
- `--pages` (default `2`) — сколько страниц результатов по каждому запросу
- `--per-page` (default `100`) — вакансий на страницу

### Для API
- `token` — HH access token (опционально)
  - без токена обычно тоже работает, но зависит от ограничений.
- `sleep_s` (default `0.2`) — пауза между запросами к вакансиям
- `search_sleep_s` — пауза между поисковыми запросами (только для `export/auto`, default `0.2`)

## Частые проблемы
1. `Sheet 'Sheet1' not found`
   - значит лист называется иначе; используйте `--sheet "ИмяЛиста"`.
2. Пустой `key_skills`
   - у части вакансий HH может не отдавать `key_skills`.
3. Слишком много мусора в `Ключевики`
   - уменьшите `--kw-top-n` и/или `--kw-max-ngram`.

## Структура репозитория
- `hh_research/` — общая логика (API HH, ключевики, Excel, пайплайн).
- `hh_keyskills_export.py` thin CLI над `hh_research`.
- `web/app.py` — **FastAPI**: выгрузка в Excel по HTTP (для UI на Next.js).
- `frontend/` — **Next.js** (форма и скачивание файла).

## HTTP API (FastAPI)

Локальный запуск:

```powershell
pip install -r requirements.txt
$env:DEV_CORS_ANY_LOCALHOST="1"
python -m uvicorn web.app:app --host 127.0.0.1 --port 8000
```

Проверка: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) и [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) (Swagger).

Эндпоинты:
- `POST /api/v1/export/manual` — тело JSON: `vacancy_ids_or_urls` (список ID или URL), опционально `kw_top_n`, `kw_max_ngram`, `token`, `sleep_s`. Ответ — файл `.xlsx`.
- `POST /api/v1/export/auto` — тело JSON: `queries`, `pages`, `per_page`, опционально `kw_top_n`, `kw_max_ngram`, `token`, `sleep_s`, `search_sleep_s`. Ответ — `.xlsx`.

Ограничение: за один запрос обрабатывается не больше **100** вакансий (можно изменить env `HH_EXPORT_MAX_VACANCIES`).

### Переменные окружения API

| Переменная | Назначение |
|------------|------------|
| `HH_TOKEN` | Bearer-токен HH (опционально; можно передать `token` в JSON). |
| `CORS_ORIGINS` | Разрешённые origin через запятую (по умолчанию `http://localhost:3000`). Для Vercel добавьте URL вида `https://your-app.vercel.app`. |
| `API_SHARED_KEY` | Если задан — клиент обязан передать заголовок `X-API-Key` с тем же значением. |
| `HH_EXPORT_MAX_VACANCIES` | Макс. число вакансий за один запрос (по умолчанию `100`). |

## Деплой API (отдельно от Vercel)

Фронт на **Vercel** ходит к Python API, который нужно поднять на хосте с подходящим **timeout** (Railway, Render, Fly.io, VPS, Kubernetes).

1. Команда процесса: `uvicorn web.app:app --host 0.0.0.0 --port $PORT` (на некоторых платформах подставляется свой `PORT`).
2. Задайте в панели хостинга те же env, что в таблице выше; в `CORS_ORIGINS` укажите домен фронта на Vercel.
3. Альтернатива: сборка из [Dockerfile](Dockerfile) в корне (`docker build -t hhresearch-api .`).

## Фронтенд (Next.js)

```powershell
cd frontend
npm install
npm run dev
```

На Vercel в переменных окружения задайте `NEXT_PUBLIC_API_URL` — публичный URL вашего API (с `https://`).

Локально после запуска API (см. секцию `HTTP API`) в `frontend/.env.local` задайте:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
# опционально:
# NEXT_PUBLIC_API_KEY=...
```

## Что можно улучшить дальше (по желанию)
- Дедупликация навыков/ключевиков (если захотите считать частоты корректнее).
- Более качественная NLP-экстракция ключевых фраз (вместо эвристики).
- Автоматическая агрегация “популярности” прямо в Excel (сводные таблицы/скриптом).
- Фоновые задачи и OAuth hh.ru при большой нагрузке (см. ниже).

### Масштабирование позже
- **Очередь задач** (RQ/Celery + Redis или hosted queue): длинные экспорты вынести из HTTP-запроса, отдавать `job_id` и статус/ссылку на файл.
- **NextAuth или OAuth hh.ru** при публичном доступе: привязка запросов к пользователю HH и соблюдение [условий API](https://dev.hh.ru/admin/developer_agreement).

