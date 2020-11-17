import getAsset from '../../insalesApi/getAsset';
import getWidgetType from '../../insalesApi/getWidgetType';
import logger from '../../logger';
import delay from 'delay';

/**
 * Скачать ассет
 */
export default function download (asset) {
  return new Promise((resolve, reject) => {
    delay(100)
      .then(() => {
        if (asset.handle) {
          getWidgetType.apply(this, [asset, {method: 'download'}]).then(() => {
            resolve(asset)
          }, function () {
            logger.error('Download WidgetType error');
            resolve(asset);
          })
        }else{
          getAsset.apply(this, [asset, {method: 'download'}]).then(() => {
            resolve(asset)
          }, function () {
            logger.error('Download error');
            resolve(asset);
          })
        }
      })
  });
};
