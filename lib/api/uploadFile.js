import updateAssets from '../insalesApi/uploadFile';
import getFileList from '../help/getFileList';
import log from 'fancy-log';

/**
 * Загрузить директорию files в раздел файлов
 */
export default function uploadFile() {
  const TaskManager = this.TaskManager;
  log('upload:file:start');

  return new Promise((resolve, reject) => {
    getFileList(this.paths.files, this)
      .then((uploadList) => {
        return TaskManager.run('asset:push:file', uploadList);
      })
      .then(()=> {
        log('upload:file:finish');
        resolve();
      })
      .catch((e) => {
        log(e);
        resolve(e);
      })
  });
}
