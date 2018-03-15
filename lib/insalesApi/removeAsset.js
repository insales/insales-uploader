'use strict';
import InsalesApi from 'insales';
import logger from '../logger';

/**
 * удаление ассета
 * @param {number} assetId [description]
 * @param {text} path    [description]
 * @param {object} options    [description]
 * @param {object} assets    [description]
 */

export default function removeAsset (assetId, path, options, assets, log = true) {
  const InSales = InsalesApi(options.insalesApi);

  return new Promise((resolve, reject) => {
    InSales.removeAsset({
      token: options.account.token,
      url: options.account.url,
      theme: options.theme.id,
      assetId: assetId,
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
