# InSales <> uploader

[![npm version](https://img.shields.io/npm/v/insales-uploader)](https://www.npmjs.com/package/insales-uploader)

Менеджер ассетов для платформы [InSales](http://www.insales.ru/).

> [:arrow_forward: Установка/Настройка/Запуск](https://www.youtube.com/watch?v=ImFlI1sUp5U)


## Почему InSales uploader?

:computer: Разработка сайтов на локальном диске

Загрузка готовых файлов: сборка CSS/JS выполняется внешними инструментами.

:file_folder: Файлы шаблона автоматически сортируются по типам


## Требования и совместимость

Нужен **Node.js 22.18 или новее**. В v2 сохранены `require('insales-uploader')`, вызов с `new` и без него, JS-конфиги и основные команды CLI. TypeScript нужен только для разработки самого uploader; пользователи устанавливают готовый JavaScript-пакет с декларациями типов.

**Gulp-интеграция удалена.** Методов `src`, `dest`, потокового `watch`, `triggerFile` и настроек `plugins` больше нет. См. [переход с v1 на v2](MIGRATION.md).

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

async function main() {
  await IU.download();
  await IU.stream();
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
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

### Скачивание без перезаписи неизменённых файлов

Чтобы повторное скачивание сохраняло время изменения локальных файлов с тем же содержимым, включите `theme.skipUnchanged` в `insales-config.js`:

```javascript
theme: {
  id: '854716',
  root: './',
  skipUnchanged: true
}
```

При `skipUnchanged: true` uploader скачивает содержимое и сравнивает его с локальным файлом побайтово. Если содержимое совпадает, запись пропускается и локальный `mtime` сохраняется. Новые и изменённые файлы записываются как обычно, в том числе поверх локальных правок. Пробелы и переводы строк тоже считаются изменением содержимого.

Флаг действует для `download`, методов скачивания отдельных типов ассетов, скачивания перед `start`, `downloadFiles` и копирования из `media` в `assets`. Учитываются текстовые и бинарные файлы, исходники и превью виджетов. По умолчанию `skipUnchanged: false`, поэтому файлы перезаписываются при каждом скачивании.

Флаг сохраняет существующее локальное время изменения, а новые и изменённые файлы получают время записи на компьютере. Дата изменения на сервере не восстанавливается. Число запросов к серверу не уменьшается; резервные копии создаются по настройке `theme.backup`.

`pull` сначала удаляет локальные папки темы, поэтому флаг не сохраняет время изменения при этой операции. Для повторного скачивания с сохранением дат используйте `download`.


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
npm run check
npm run test:coverage
```

`npm run check` выполняет проверку форматирования, ESLint без предупреждений, строгую проверку TypeScript, сборку, тесты и установку npm-архива в чистый проект. Проверяются CommonJS, ESM, CLI и типы потребителя. Архив остаётся в `.artifacts`; эта команда ничего не публикует. `npm run format` форматирует TypeScript-исходники.

`npm ci` собирает `dist` через `prepare`. `npm run compile` очищает и собирает `dist` через TypeScript; ошибки типов запрещают сборку. Lock-файл хранится в Git. `npm run typecheck` также проверяет отрицательные примеры типов: неверное имя задачи или данные другого типа не должны компилироваться.

Тесты используют `node:test`, временные директории и локальные HTTP-серверы. Ключи магазина не нужны. Проверяются API, загрузка и скачивание, виджеты, бинарные данные, очередь, CLI, резервные копии и настоящий файловый watcher. Покрытие сохраняется в `coverage.lcov` без обязательного процентного порога.

GitHub Actions проверяет Windows/Linux/macOS и Node.js 22.18/24. Один собранный архив устанавливается и проверяется во всей матрице. В процессе проверки повторная сборка этого архива не выполняется.

## TypeScript и события обновления

```typescript
import uploader, {type Options} from 'insales-uploader';

const options: Options = {
  account: {id: 'key', token: 'secret', url: 'example.myinsales.ru'},
  theme: {
    id: 42,
    onUpdate: async update => {
      console.log(update.event, update.path, update.asset.type);
    }
  }
};

const app = uploader(options); // new uploader(options) тоже поддерживается
```

`stream(callback)` и `theme.onUpdate` вызываются после успешной загрузки или удаления. Объект события содержит `event`, `path`, `asset`, `insalesInfo`; это обычные данные, без Vinyl и потоковых методов. Async-callbacks ожидаются последовательно. Ошибки запуска отклоняют Promise; ошибки во время наблюдения логируются и передаются через `app.eventEmitter.on('watchError', handler)`. Следующие файловые события продолжают обрабатываться.

## Синхронизация и виджеты

Перед `upload` должны существовать папки `templates`, `snippets`, `config` и `media`. Начать можно с `download`. Если папку нельзя прочитать, загрузка прекращается до изменения сервера. `upload` по-прежнему удаляет обычные ассеты, отсутствующие локально; серверный отказ удалить защищённый ассет теперь становится ошибкой.

Для виджета храните метаданные в `widget_types/<handle>/info.json`, а исходники — рядом. Новый виджет создаётся одним запросом с метаданными и исходниками. `upload` обновляет локальные виджеты, сохраняя удалённые виджеты, которых локально нет. Во время `stream` удаление `info.json` удаляет виджет, а удаление отдельного исходника очищает соответствующее поле.

`pull` сначала проверяет доступ к API и при `theme.backup: true` сохраняет локальную копию, затем заменяет файлы. При сбое скачивания готовая резервная копия остаётся в `backup`. `backup()` возвращает путь к уникальному ZIP-архиву, включающему папки темы и `assets`, без файла настроек с ключами API.
