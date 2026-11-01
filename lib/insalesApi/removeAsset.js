'use strict';
import InsalesApi from './client';
import logger from '../logger';

/**
* удаление ассета
* @param {number} assetId id ассета
* @param {text} path    путь к файлу
* @param {object} options    глобальные настройки
* @param {object} assets    список ассетов
*/
export default function removeAsset (assetId, path, options, assets, log = true) {
  const InSales = InsalesApi(options.insalesApi);

  return new Promise((resolve, reject) => {
    InSales.removeAsset({
      token: options.account.token,
      url: options.account.url,
      theme: options.theme.id,
      assetId: assetId,
    }).then(async output => {
      try {
        await InSales.getAsset({token: options.account.token, url: options.account.url, theme: options.theme.id, assetId});
      } catch (error) {
        if (error.statusCode !== 404) throw error;
        delete assets[path];
        if (path && log) logger.red(`Remove: ${path}`);
        return resolve();
      }
      throw new Error(`API did not remove asset: ${path}`);
    }).catch(err => {

      if (err.msg && path) {
        logger.error(`Remove error: ${path}`);
        console.log(err.msg);
      }
      reject(err)
    });

  });
}
