import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import logger from '../../logger';

/**
* Записать файл синхронно
* @param  {string} assetPath    [description]
* @param  {string} content [description]
* @return {Promise}         [description]
*/
export default function write(asset) {
  const content = asset.content;
  const assetPath = asset.path;
  const dest = (Array.isArray(assetPath)) ? assetPath : [assetPath];

  return new Promise((resolve, reject) => {

    try {
      dest.forEach(file => {
        let currentDir = path.dirname(file);
        let existsDir = fs.existsSync(currentDir);
        if (!existsDir) {
          mkdirp.sync(currentDir);
        }
        fs.writeFileSync(file, content);
      });
    } catch (err) {
      logger.red(err);
    } finally {
      resolve();
    }

  });
};
