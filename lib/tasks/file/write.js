import fs from 'fs';
import logger from '../../logger';

/**
* Записать файл синхронно
* @param  {string} path    [description]
* @param  {string} content [description]
* @return {Promise}         [description]
*/
export default function write(asset) {
  const content = asset.content;
  const path = asset.path;
  const dest = (Array.isArray(path)) ? path : [path];

  return new Promise((resolve, reject) => {

    try {
      dest.forEach(file => {
        fs.writeFileSync(file, content);
      });
    } catch (err) {
      logger.red(err);
    } finally {
      resolve();
    }

  });
};
