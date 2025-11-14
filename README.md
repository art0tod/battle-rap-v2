# Battle Rap Platform

Независимая платформа для большого турнира «Независимый баттл» и экосистемы баттлов: отборы, раунды, судейство, рейтинги и пост‑турнирные вызовы.

## Роли и возможности

- Артисты: регистрация (почта, опционально VK), профиль (аватар, био, соцсети), загрузка аудио+текста в раундах, участие в отборах и парных раундах. После вылета — ограничение на загрузку в основной сетке.
- Судьи: панель судьи с назначениями, прослушивание и оценивание (pass/fail, 0–5, рубрика 0–3), история оценок, «случайные пары» и выбор вручную.
- Зрители: прослушивание работ, лайки в парных баттлах, комментарии, рейтинги/топы/статистика.
- Админ/модератор: создание турниров/раундов/баттлов/судей, редактирование данных, модерация, аудит и статистика.

## Турнирная логика (MVP)

- Отбор 1: pass/fail, проход при 3/5 положительных.
- Отбор 2: шкала 0–5 (в БД нормализуется до 0–100), проходят топ‑N по сумме.
- Парные раунды: рубрика 0–3 (рифмы/смысл/раскрытие темы/общее впечатление), стратегия финализации — weighted или majority.

## Социальные взаимодействия (MVP)

- Лайки: только для треков в парных раундах, 1 лайк на пользователя. Эндпоинты: `POST /api/v1/engagement/likes`, `DELETE /api/v1/engagement/likes/:matchTrackId`.
- Комментарии: `GET/POST /api/v1/engagement/comments` (по `match_id`, опционально с `match_track_id`).

## UI и темы

- Цветовая тема: чёрный + золотой (вариативные gold‑accent переменные в `battle-rap-front/src/app/globals.css`).
- Раздел «Вызовы» (`/challenges`) реализует мини‑баттлы 1×1: авторы создают вызовы, соперники принимают или отклоняют их, а аудитория голосует за понравившийся трек.

## Ограничения медиа

- Допустимые MIME аудио: задаются `ALLOWED_AUDIO_MIME` (по умолчанию mp3/wav/aac/m4a/ogg/webm).
- Максимальный размер аудио: `MAX_AUDIO_SIZE_BYTES` (по умолчанию 25 МБ). Проверка на этапе presign.

## Quick local setup

1. **Install tools**

   - Docker & Docker Compose (v2 recommended).
   - `pnpm` if you plan to run services manually outside containers.

2. **Prepare environment**

   - Copy `battle-rap-front/.example.env.local` to `.env.local` and adjust any overrides (especially API/media hosts).
   - Ensure `docker-compose.yml` is the version in this repo (it already wires Postgres/Redis/Minio/API/Front/Adminer and exposes ports `15432`, `16379`, `19000`, `19001`, `3000`, `3001`, `8080`).

3. **Bring up the stack**

   ```bash
   docker compose up --build
   ```

   - This command builds the front/api images, runs migrations automatically (if configured in the Dockerfile entrypoint), and streams logs.
   - Adminer is available at `http://localhost:8080` (connect to `postgres:5432`/`app`/`adminadmin`/`battle_rap`).

4. **Seed the database (if empty)**

   ```bash
   docker compose run --rm api pnpm migrate
   docker compose run --rm api pnpm seed:demo-battle
   ```

   - The first command creates schema/tables; the second populates admin/test users and sample battles.
   - You can inspect data via Adminer or another Postgres client using the published port `15432`.

5. **Access the app**

   - Front-end: `http://localhost:3001`.
   - API: `http://localhost:3000/api/v1/...` for direct calls.
   - Media & uploads served from Minio at `http://localhost:19000` with console on `http://localhost:19001`.

6. **Additional help**
   - Logs: `docker compose logs -f api front`
   - Stop everything: `docker compose down`
   - Fresh DB: `docker compose down -v` (destroys volumes) followed by steps 3–5.

Keep `.env` files out of version control, and if you prefer not to use Adminer, replace that service with your Postgres client of choice. If you hit `ERR_EMPTY_RESPONSE` in the browser, confirm API and front both run and that `http://localhost:3000/health` returns ok.\*\*\*
