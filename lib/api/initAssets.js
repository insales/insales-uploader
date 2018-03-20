import fs from 'fs';
import upath from 'upath';
import cpFile from 'cp-file';
import mkdirp from 'mkdirp';
import getExtention from '../help/getExtention';

/**
 * Сортировка медиафайлов в папку assets
 * @param  {object} paths директории проекта
 */
export default function initAssets(paths) {
  return new Promise(function (resolve, reject) {
    const media = paths.folders.media;
    const files = fs.readdirSync(media);

    // Создать директории
    Object.values(paths.folders).forEach((folder) => {
      mkdirp(folder);
    });

    files.forEach(file => {
      let parsePath = upath.parse(upath.toUnix(file));
      let name = parsePath.base;
      let ext = getExtention(file);
      let dest = paths.mediaExtension[ext] || paths.folders['assetsMedia'];
      let stat = fs.statSync(media + file);
      if (!stat.isDirectory()) {
        cpFile.sync(media + file, dest + name)
      }
    });

    resolve()
  })
}
