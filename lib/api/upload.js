import checkLocalAssets from './checkLocalAssets';
import updateAssets from '../insalesApi/updateAssets';
import sortAssetFolders from '../options/sortAssetFolders';
import log from 'fancy-log';

/**
 * Загрузить тему на сервер
 */
export default function upload() {
  const options = this.options;
  const TaskManager = this.TaskManager;
  log('theme:upload:start');

  return new Promise((resolve, reject) => {
    updateAssets(options)
      .then(assets => {
        return sortAssetFolders.apply(this, [assets]);
      })
      .then(()=> {
        return checkLocalAssets.apply(this, [false])
      })
      .then((diff) => {
        // эти нужно загрузить на сервер
        let upload = diff.serverError;
        // эти нужно удалить с сервера
        let remove = diff.localError;

        let toServer = getServerTasks(remove, this.downloadList);

        const uploadList = upload.reduce((prev, curr)=> {
          const file = this.getFileInfo({path: curr}, true);
          if (file.isDirectory) {
            return [...prev]
          }
          file.asset.uploadType = 'upload';
          return [...prev, file.asset]
        }, []);

        const editList = toServer.forEdit.reduce((prev, curr)=> {
          const file = this.getFileInfo({path: curr.pathKey}, true);
          file.asset.uploadType = 'edit';
          if (file.isDirectory) {
            return [...prev]
          }
          return [...prev, file.asset]
        }, []);

        const removeList = toServer.forRemove;
        return TaskManager.run('asset:upload', [...uploadList, ...editList, ...removeList], {
          template: 'Uploading: [:bar] :percent'
        });
      })
      .then(()=> {
        log('theme:upload:finish');
        resolve();
      })
      .catch((e) => {
        if (e) log(e);
        resolve(e);
      })
  });
}

function getServerTasks(remove, download) {
  const forEdit = [];
  const forRemove = [];
  download.forEach(asset => {
    if (remove.indexOf(asset.pathKey) === -1) {
      asset.uploadType = 'edit';
      forEdit.push(asset);
    }else{
      asset.uploadType = 'remove';
      forRemove.push(asset);
    }
  });

  return {
    forEdit,
    forRemove
  }
}
