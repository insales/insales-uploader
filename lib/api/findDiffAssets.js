'use strict';
import fs from 'fs';
import omitAssets from '../help/omitAssets';
import upath from 'upath';

/**
 * Поиск в различии списка файлов
 * @param  {object} folders  директории проекта
 * @param  {object} assets   список ассетов на севере
 * @return {promise}         Промис с ошибками
 */
export default function findDiffAssets (folders, assets, setError) {
  let localAssets = [];
  return new Promise(function(resolve, reject) {
    Object.values(folders).forEach(readingFolders);
    resolve(omitAssets(assets, localAssets));
  });

  // Получить список локальных файлов
  function readingFolders(folder, index, array) {
    try {
      let folderAssets = fs.readdirSync(folder);
      let folderAssetsPaths = folderAssets.reduce(function(prev, curr) {
        let nextPath = upath.normalize(folder+curr);
        let stat = fs.statSync(nextPath);
        if (stat.isDirectory()) {
          return [...prev]
        }
        return [...prev, nextPath];
      }, []);

      localAssets = [...localAssets, ...folderAssetsPaths];
    } catch (e) {
      console.log('Отсутствует директория: ', folder);
    }
  }
}
