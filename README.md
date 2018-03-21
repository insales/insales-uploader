# InSales <> uploader
Менеджер ассетов для платформы [InSales](http://www.insales.ru/).

> [Пример организации работы с InSales <> uploader](https://github.com/insales-uploader/uploader-work-space)

## Почему InSales uploader?

:computer: Разработка сайтов на локальном диске

:heart: Совместимость с тысячами Gulp плагинов

:file_folder: Файлы шаблона автоматически сортируются по типам


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
    http: true
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

Чтобы воспользоваться InSales-Uploader через консоль, установите пакет глобально `npm install insales-uploader -g`.

#### Файл настроек

Имя файла - **insales-config.js**

```javascript
module.exports = {
  account: {
    id: '0123456798',
    token: '0123456798',
    url: 'shop-41324.myinsales.ru',
    http: true
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

`uploader <название метода> <название метода>`

Примеры:

`uploader init` - создаст файл настроек **insales-config.js**

`uploader` - запустит метод `start`

`uploader download` - запустит метод `download`

`uploader download stream` - запустит методы `download stream`


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

![InSales](https://cdn.rawgit.com/brainmurder/insales-uploader/master/insales.png)
