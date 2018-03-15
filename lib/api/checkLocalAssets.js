'use strict';
import findDiffAssets from './findDiffAssets'
import logger from '../logger';

// Проверяет списки файлов и логирует разницу сервера и локальных директорий
export default function checkLocalAssets(log = true) {
  const paths = this.paths;
  const assets = this.assets;

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
    console.warn('Список файлов на сервере совпадает с локальной версией');
  }
}
