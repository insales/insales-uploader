'use strict';
import InsalesApi from 'insales';
import logger from '../logger';

// <asset>
//   <content><![CDATA[amazing template for product {{product.title}}]]></content>
// </asset>

/**
 * Обновление ассета
 * @param {object} insalesInfo   [description]
 * @param {string} assetId [description]
 * @param {string} path    [description]
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
