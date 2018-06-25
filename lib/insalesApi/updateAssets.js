'use strict';
import InsalesApi from 'insales';
import logger from '../logger';

/**
 * Обновление списка ассетов
 */
export default function updateAssets(options) {
  const InSales = InsalesApi(options.insalesApi);

  return new Promise((resolve, reject) => {
    InSales.listAsset({
      token: options.account.token,
      url: options.account.url,
      theme: options.theme.id
    }).then(response => {
      let assets = response.data.assets.asset;
      resolve(assets);
    }).catch(err => {
      if (err.msg && err.msg != '') {
        console.log(err.msg);
      }
      if (err.type == 'Fail') {
        logger.error(`Проверьте id темы ${options.theme.id}, url ${options.account.url}, а так же token/password`);
      }
      reject(err);
    });
  });
}
