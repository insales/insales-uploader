'use strict';
import InsalesApi from 'insales';
import themeInfo from '../options/themeInfo';
import logger from '../logger';

/**
 * Обновление списка ассетов
 */
export default function updateAssets(options, assetType) {
  const InSales = InsalesApi(options.insalesApi);
  let assets = [];

  return new Promise((resolve, reject) => {
    InSales.listAsset({
      token: options.account.token,
      url: options.account.url,
      theme: options.theme.id
    }).then(response => {
      assets = response.data;
      if (assetType == 'Asset::Widget') {
        return resolve(assets);
      }else{
        return InSales.listWidgetTypes({
          token: options.account.token,
          url: options.account.url,
          theme: options.theme.id
        })
      }
    }).then(response => {
      if (assetType !== 'Asset::Widget') {
        resolve([...assets, ...response.data]);
      }
    }).catch(err => {
      if (typeof err.msg == 'string') {
        logger.error(err.msg);
      }else{
        console.log(err.msg);
      }
      let headers = err.response.headers;
      let status = headers.status;
      let limit = (headers['api-usage-limit'].split('/')[0]) ? headers['api-usage-limit'].split('/')[0] : 0;
      if (status.indexOf('503') > -1 && limit >= 500) {
        logger.error(`Превышен лимит обращений к API (500)`);
      }
      if (err.type == 'Fail') {
        logger.error(`Проверьте id темы ${options.theme.id}, url ${options.account.url}, а так же token/password`);
        InSales.listThemes({
          token: options.account.token,
          url: options.account.url
        }).then(response => {
          let responseTheme = response.data.themes.theme;
          // Если в магазине 1 тема то responseTheme является объектом, иначе массивом
          let themes = (Array.isArray(responseTheme)) ? responseTheme : [responseTheme];

          let theme = themeInfo(options, themes);
          logger.green('Доступные темы:');
          theme.list.forEach((theme) => {
            logger.bold(`${theme.title} (${theme.type}): ${theme.id}`);
          });
        })
      }
      reject(err);
    });
  });
}
