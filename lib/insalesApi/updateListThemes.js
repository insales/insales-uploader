'use strict';
import InsalesApi from 'insales';
import themeInfo from '../options/themeInfo';

/**
 * Обновление списка тем
 * @return {object} объект текущей темы
 */
export default function updateListThemes() {
  const InSales = InsalesApi(this.options.insalesApi);
  let options = this.options;

  return new Promise((resolve, reject) => {
    InSales.listThemes({
      token: options.account.token,
      url: options.account.url
    }).then(response => {
      let responseTheme = response.data;
      // Если в магазине 1 тема то responseTheme является объектом, иначе массивом
      let themes = (Array.isArray(responseTheme)) ? responseTheme : [responseTheme];

      let theme = themeInfo(options, themes);
      resolve(theme);
    }).catch(err => {
      if (err.msg) {
        console.log(err.msg);
      }
      reject(err);
    });
  });
}
