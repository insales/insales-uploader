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
      let headers = err.response.headers;
      let status = headers.status;
      let limit = headers['api-usage-limit'].split('/')[0];
      if (status.indexOf('503') > -1 && limit >= 500) {
        logger.error(`Превышен лимит обращений к API (500)`);
      }
      if (err.type == 'Fail') {
        logger.error(`Проверьте id темы ${options.theme.id}, url ${options.account.url}, а так же token/password`);
      }
      reject(err);
    });
  });
}
