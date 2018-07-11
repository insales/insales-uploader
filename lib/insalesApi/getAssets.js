'use strict'
/**
 * Скачать ассеты
 * @param  {string} typeAssets тип ассета
 */
export default function getAssets (typeAssets) {
  const downloadList = this.downloadList;
  const TaskManager = this.TaskManager;
  return new Promise((resolve, reject) => {

    // Запустить таск менеджер
    filterDownloadAssets(typeAssets, downloadList)
    .then(assetList => {
      return TaskManager.run('asset:download', assetList, {
        template: 'Downloading: :name [:bar] :percent'
      });
    })
    .then(() => {
      resolve();
    })
  });
}

function filterDownloadAssets(typeAssets, downloadList) {
  const assetList = [];
  return new Promise((resolve, reject) => {
    if (!typeAssets) {
      resolve(downloadList);
      return;
    }

    downloadList.forEach(asset => {
      if (typeAssets.indexOf(asset.type) > -1) {
        assetList.push(asset);
      }
    });

    resolve(assetList);
  });
}
