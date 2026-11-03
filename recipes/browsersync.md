# Browser-sync для Insales-uploader

## Установка

```
npm install browser-sync
```

## Добавление browser-sync к настройкам

```js
const bs = require('browser-sync').create('insales_server');
let optionBS = {
  proxy: 'https://shop-41254.myinsales.ru/?theme_preview=854716',
  reloadDebounce: 5000,
  reloadDelay: 2000,
  https: false
};

bs.init(optionBS);

module.exports = {
  account: {
    // id: '11111111111111111111111111',
    // token: '222222222222222222222',
    // url: 'shop-41254.myinsales.ru',
    http: false // HTTPS по умолчанию; true только для явного HTTP
  },
  theme: {
    //id: '854716',
    root: '.',
    backup: true, // Создавать backup после загрузки?
    assetsSync: true, // Делать синхронизацию с директорией assets?
    onUpdate: (update)=>{
      console.log(update.event, update.path);
      bs.reload();
      // обновление темы
    },
  }
}
```

В v2 этот callback вызывается после успешной операции с API. BrowserSync устанавливается в проекте темы и не является зависимостью uploader. Gulp для этого рецепта не нужен.
