import download from 'download';
import write from './write';
import logger from '../../logger';

/**
 * Скачать и сохранить ассет
 */
export default function writeWithDownload(asset) {
  const url = asset.url.replace(/@/g, '_');
  const path = asset.path;
  const dest = (Array.isArray(path)) ? path : [path];

  return new Promise((resolve, reject) => {
    download(encodeURI(url), {
      timeout: 30000
    }).then(data => {

      write({
        path: dest,
        content: data
      }).then(() => {
        resolve();
      });

    }, err => {
      logger.red(url);
      console.log(err);
      resolve()
    });
  });
}
