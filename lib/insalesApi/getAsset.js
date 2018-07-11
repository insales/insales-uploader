'use strict'
import InsalesApi from 'insales';
import logger from '../logger';
import DownloadManager from '../tasks/file';

/**
 * Скачать ассет
 */
export default function getAsset (asset, action) {
  const InSales = InsalesApi(this.options.insalesApi);
  let options = this.options;

  return new Promise((resolve, reject) => {
    if (typeof asset.asset_url === 'string') {
      DownloadManager.run('file:writeWithDownload', [{
        path: asset.path,
        url: options.theme.assetsDomain + asset.asset_url,
        content: null
      }]).then(() => {
        resolve(asset);
      }).catch(err => {
        if (err.msg) {
          console.log(err.msg);
        }
        logger.error(`Ошибка при скачивании файла "${asset.name}", попробуйте запустить скачивание повторно.`);
        reject(err);
      });
    }else{
      InSales.getAsset({
        token: options.account.token,
        url: options.account.url,
        theme: options.theme.id,
        assetId: asset.id
      }).then(response => {
        let dataReponse = response.data.asset;
        let uri = encodeURI(options.theme.assetsDomain + dataReponse.asset_url);

        let taskName = (typeof dataReponse.content == 'string') ? 'file:write' : 'file:writeWithDownload';

        DownloadManager.run(taskName, [{
          path: asset.path,
          url: uri,
          content: dataReponse.content
        }]).then(() => {
          resolve(dataReponse);
        });

      }).catch(err => {
        if (err.msg) {
          console.log(err.msg);
        }
        logger.error(`Ошибка при скачивании файла "${asset.name}", попробуйте запустить скачивание повторно.`);
        reject(err);
      });
    }

  });
}
