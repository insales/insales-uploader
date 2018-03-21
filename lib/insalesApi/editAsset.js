'use strict';
import InsalesApi from 'insales';
import logger from '../logger';

/**
 * editAsset({content: 'Шаблон для {{product.title}}'}, 123123123, '/path/product.liquid', options);
 *
 * Обновление ассета
 * @param {object} insalesInfo объект с контентом
 * @param {string} assetId id ассета
 * @param {string} path путь к файлу
 * @param {object} options настройки
 */
export default function editAsset(insalesInfo, assetId, path, options, log = true) {
  const InSales = InsalesApi(options.insalesApi);

  return new Promise(function (resolve, reject) {
    InSales.editAsset({
      token: options.account.token,
      url: options.account.url,
      theme: options.theme.id,
      assetId: assetId,
      asset: insalesInfo
    }).then(output => {
      if (log) logger.green(`Edit: ${path}`);
      resolve();
    }).catch(err => {
      if (err.msg) {
        console.log(err.msg);
      }
      console.log(`Error edit: ${path}`);
      resolve();
    });
  });
}
