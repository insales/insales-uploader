# Browser-sync для Insales-uploader

## Установка

```
npm install browser-sync
```

## Добавление browser-sync к настройкам

```js
const bs = require('browser-sync').create('insales_server');
let optionBS = {
  proxy: 'http://shop-41254.myinsales.ru/?theme_preview=854716',
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
    http: true // Если сайт на https и отказывает работать, нужновы выставить false
  },
  theme: {
    //id: '854716',
    root: '.',
    backup: true, // Создавать backup после загрузки?
    assetsSync: true, // Делать синхронизацию с директорией assets?
    onUpdate: ()=>{
      bs.reload();
      // обновление темы
    },
  }
}
```
