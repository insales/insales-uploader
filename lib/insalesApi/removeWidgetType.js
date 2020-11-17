'use strict';
import InsalesApi from 'insales';
import logger from '../logger';

/**
* удаление ассета
* @param {number} assetId id ассета
* @param {text} path    путь к файлу
* @param {object} options    глобальные настройки
* @param {object} assets    список ассетов
*/
export default function removeWidgetType (widgetId, path, options, assets, log = true) {
  const InSales = InsalesApi(options.insalesApi);

  return new Promise((resolve, reject) => {
    InSales.removeWidgetType({
      token: options.account.token,
      url: options.account.url,
      theme: options.theme.id,
      widgetId
    }).then(output => {
      delete assets[path];
      if (path && log) logger.red(`Remove: ${path}`);
      resolve();
    }).catch(err => {
      delete assets[path];
      if (err.msg && path) {
        logger.error(`Remove error: ${path}`);
        console.log(err.msg);
      }
      resolve()
    });

  });
}
