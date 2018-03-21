'use strict';
import InsalesApi from 'insales';
import logger from '../logger';

/**
 * Загрузить файл в раздел файлы
 */
export default function uploadFile (file, path, options, log = true) {
  const InSales = InsalesApi(options.insalesApi);
  return new Promise((resolve, reject) => {
    InSales.uploadFile({
      token: options.account.token,
      url: options.account.url,
      files: {
        file
      }
    }).then(output => {
      if (log) logger.blue(`Upload: ${path}`);
      resolve()
    }).catch(err => {
      logger.error('error upload:' + path);
      if (err.msg) {
        console.log(err.msg);
      }
      resolve()
    });
  });
}
