import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import download from 'download';
import write from './write';
import logger from '../../logger';

/**
 * Скачать и сохранить ассет
 */
export default function writeWithDownload(asset) {
  const url = asset.url.replace(/@/g, '_');
  const assetPath = asset.path;
  const dest = (Array.isArray(assetPath)) ? assetPath : [assetPath];

  return new Promise((resolve, reject) => {
    download(encodeURI(url)).then(data => {
      dest.forEach(file => {
        let currentDir = path.dirname(file);
        let existsDir = fs.existsSync(currentDir);
        if (!existsDir) {
          mkdirp.sync(currentDir);
        }
      });

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
