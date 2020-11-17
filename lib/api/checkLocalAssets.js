'use strict';
import findDiffAssets from './findDiffAssets'
import objectFilter from '../help/objectFilter'
import logger from '../logger';
import log from 'fancy-log';

// Проверяет списки файлов и логирует разницу сервера и локальных директорий
export default function checkLocalAssets(log = true) {
  const paths = this.paths;
  const assets = objectFilter(this.assets, asset => {
    return asset.type == 'Asset::Widget'
  });

  return new Promise(function (resolve, reject) {
    findDiffAssets(paths.foldersDefaults, assets).then((errors) => {
      if (log) {
        consoleDiff(errors.serverError, errors.localError);
      }
      resolve(errors);
    });
  })
}

function consoleDiff(serverError, localError) {
  if (localError.length > 0) {
    console.warn('Внимание, в локальной версии отсутствуют следующие файлы:');
    localError.forEach(path => {
      logger.red(path);
    })
  }
  if (serverError.length > 0) {
    console.warn('Внимание, на сервере отсутствуют следующие файлы:');
    serverError.forEach(path => {
      logger.red(path);
    })
  }
  if (serverError.length === 0 && localError.length === 0) {
    log('Список файлов на сервере совпадает с локальной версией');
  }
}
