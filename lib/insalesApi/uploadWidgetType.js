'use strict';
import InsalesApi from 'insales';
import logger from '../logger';

/**
 * Загрузить ассет на сервер
 */
export default function uploadWidgetType (asset, path, options, log = true) {
  const InSales = InsalesApi(options.insalesApi);
  return new Promise((resolve, reject) => {
    InSales.uploadWidgetType({
      token: options.account.token,
      url: options.account.url,
      theme: options.theme.id,
      data
    }).then(output => {
      if (log) logger.blue(`Upload widget: ${asset.handle}: from ${path}`);
      resolve()
    }).catch(err => {
      logger.error('error upload:' + asset.handle);
      if (err.msg) {
        console.log(err.msg);
      }
      resolve()
    });
  });
}
