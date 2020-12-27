'use strict'
import InsalesApi from 'insales';
import logger from '../logger';
import DownloadManager from '../tasks/file';

/**
 * Скачать ассет
 */
export default function getWidgetType (widgetType, action) {
  const InSales = InsalesApi(this.options.insalesApi);
  let options = this.options;
  let isLink = (typeof widgetType.asset_url == 'string');
  let taskName = (isLink) ? 'file:writeWithDownload' : 'file:write';
  let content = (widgetType.content) ? widgetType.content : '';

  return new Promise((resolve, reject) => {
    if (isLink && widgetType.asset_url == "/previews/original/missing.png") {
      resolve(widgetType);
    }
    DownloadManager.run(taskName, [{
      path: widgetType.path,
      url: (isLink) ? widgetType.asset_url : null,
      content: (isLink) ? null : content
    }]).then(() => {
      resolve(widgetType);
    }).catch(err => {
      if (err.msg) {
        console.log(err.msg);
      }
      logger.error(`Ошибка при скачивании файла "${widgetType.name}", попробуйте запустить скачивание повторно.`);
      reject(err);
    });
  });
}
