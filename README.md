# InSales <> uploader
Менеджер ассетов для платформы [InSales](http://www.insales.ru/).

> [Минимальный конфиг Gulp.js](https://github.com/brainmurder/InSales-uploader-gulp-test)

> [Консольный клиент для InSales uploader](https://github.com/VladimirIvanin/devu)

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
