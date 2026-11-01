# InSales <> uploader
Менеджер ассетов для платформы [InSales](http://www.insales.ru/).

> [:arrow_forward: Установка/Настройка/Запуск](https://www.youtube.com/watch?v=ImFlI1sUp5U)

> [:octocat: Пример организации работы с InSales <> uploader](https://github.com/insales-uploader/uploader-work-space)

## Почему InSales uploader?

:computer: Разработка сайтов на локальном диске

:heart: Совместимость с тысячами Gulp плагинов

:file_folder: Файлы шаблона автоматически сортируются по типам


## Требования и совместимость

Нужен **Node.js 22.18 или новее**. Обновление сборки до Babel 8 и переход на встроенный `fetch` прекращают поддержку Node.js 10–20. Внешний интерфейс `require('insales-uploader')`, вызов с `new` и CLI сохранены.

По умолчанию используется HTTPS. Для локального HTTP-сервера явно задайте `account.http: true`. Ошибки API, сети и файловой системы отклоняют Promise; CLI завершает команду с ненулевым кодом. В своих скриптах обрабатывайте ошибки через `.catch(...)` или `try/catch`.

## Установка

```
npm install insales-uploader
```

## Пример

```javascript
// Настройки
const options = {
  account: {
    id: '0123456798',
    token: '0123456798',
    url: 'shop-41324.myinsales.ru',
    http: false
  },
  theme:{
    id: '854716',
    root: './',
    backup: true,
    assetsSync: true
  },
  util: {
    openBrowser: true
  }
}

// Инициализация
const uploader = require('insales-uploader');
const IU = new uploader(options);

IU.download()
  .then(()=>{
    return IU.stream()
  })
```

### Консольный клиент

Чтобы воспользоваться InSales-Uploader через консоль, установите пакет глобально:
`npm install insales-uploader -g`.

<img src="https://cdn.rawgit.com/insales/insales-uploader/master/uploader-cli.gif" width="552">

#### Файл настроек

Имя файла - **insales-config.js**

```javascript
module.exports = {
  account: {
    id: '0123456798',
    token: '0123456798',
    url: 'shop-41324.myinsales.ru',
    http: false
  },
  theme:{
    id: '854716',
    root: './',
    backup: true,
    assets: true,
    assetsSync: true,
    excludeFiles: []
  },
  util: {
    openBrowser: true
  }
};
```

#### Запуск методов:

`uploader <название метода>`

Примеры:

`uploader init` - создаст файл настроек **insales-config.js**

`uploader` - запустит метод `start`

`uploader download` - запустит метод `download`

`uploader -h` - справка


### Структура папок

Папки `media` и `assets`, дублирут друг друга. Когда запущен стрим изменения попадают в обе папки. Так же при скачивании файлы раскладываются в `media` и `assets`. Assets создаётся для удобства работы.
Папка `media` является приоритетной, так как она предусмотрена архитектурой тем на платформе InSales.

```
root/
    |-- assets/
        |-- fonts/
        |-- img/
        |-- js/
        |-- media/
        |-- style/
        |-- svg/
    |-- config/
    |-- media/
    |-- snippets/
    |-- templates/
    |-- backup/
```

![InSales](https://cdn.rawgit.com/insales/insales-uploader/master/insales.png)

## Разработка и проверка

```sh
npm ci
npm test
npm run test:coverage
npm pack --dry-run
```

`npm ci` собирает `dist` через `prepare`. `npm run compile` пересобирает исходники вручную; ошибки сборки завершают команду с ошибкой. Lock-файл хранится в Git.

Тесты используют встроенный `node:test`, временные директории и локальные HTTP-серверы. Ключи реального магазина не нужны. Проверяются контракт API, загрузка и скачивание, виджеты, бинарные данные, ошибки, очередь, CLI, резервные копии и настоящий файловый watcher. Покрытие сохраняется в `coverage.lcov`; LCOV используется также для обхода сбоя текстового отчёта покрытия Node.js 22 на Windows.

В GitHub Actions добавлена матрица Windows/Linux и Node.js 22.18/24 с тестами и проверкой упаковки.

## Синхронизация и виджеты

Перед `upload` должны существовать папки `templates`, `snippets`, `config` и `media`. Начать можно с `download`. Если папку нельзя прочитать, загрузка прекращается до изменения сервера. `upload` по-прежнему удаляет обычные ассеты, отсутствующие локально; серверный отказ удалить защищённый ассет теперь становится ошибкой.

Для виджета храните метаданные в `widget_types/<handle>/info.json`, а исходники — рядом. Новый виджет создаётся одним запросом с метаданными и исходниками. `upload` обновляет локальные виджеты, сохраняя удалённые виджеты, которых локально нет. Во время `stream` удаление `info.json` удаляет виджет, а удаление отдельного исходника очищает соответствующее поле.

`pull` сначала проверяет доступ к API и при `theme.backup: true` сохраняет локальную копию, затем заменяет файлы. При сбое скачивания готовая резервная копия остаётся в `backup`. `backup()` возвращает путь к уникальному ZIP-архиву, включающему папки темы и `assets`, без файла настроек с ключами API.
