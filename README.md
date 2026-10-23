# My Hub

Личный хаб серверов и ссылок в стиле Material 3.

## Структура

- `index.html` — публичная страница хаба.
- `admin.html` — отдельная админка.
- `worker.js` — API на Cloudflare Workers, использующее D1.
- `wrangler.toml` — привязка к D1-базе `hub`.

## Подключение базы

База D1 `hub` должна быть создана в том же Cloudflare-аккаунте. В конфигурации уже указан её ID.

Из корня репозитория после установки Node.js и Wrangler:

```powershell
npm install -g wrangler
wrangler login
wrangler deploy
wrangler secret put ADMIN_PASSWORD_SHA256
```

При последней команде введи SHA-256-хеш нового пароля админки. Не добавляй пароль или его хеш в публичные файлы. Для генерации хеша в PowerShell:

```powershell
$Password = Read-Host "Новый пароль админки"
$Bytes = [Text.Encoding]::UTF8.GetBytes($Password)
$Hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($Bytes)).ToLower()
$Hash
```

Используй длинный уникальный пароль, а не короткий PIN. После деплоя API ожидается по адресу `https://stunning-fishstick-api.kurockinsava.workers.dev`. Если Cloudflare назначит другой URL, обнови `API_BASE` в `index.html` и `admin.html`.

## Как работает

- Публичная страница загружает общие серверы и ссылки из D1.
- Админка отправляет изменения в API, доступ к записи защищён серверной сессией.
- Сессия действует 12 часов.
- Экспорт/импорт JSON доступен в админке.

## Лимиты

На Cloudflare Workers Free для D1 включено 5 млн прочитанных строк в сутки, 100 000 записанных строк в сутки и 5 ГБ суммарного хранилища аккаунта; одна база на Free ограничена 500 МБ. При превышении суточных лимитов запросы блокируются до сброса лимита. Условия могут меняться — сверяйся с [официальными лимитами D1](https://developers.cloudflare.com/d1/platform/limits/) и [тарифами](https://developers.cloudflare.com/d1/platform/pricing/).

## Важно

Статический интерфейс и API должны быть опубликованы отдельно. После изменения исходников в GitHub Pages изменения API автоматически не развернутся: для `worker.js` нужен деплой через Wrangler или Cloudflare Dashboard.
