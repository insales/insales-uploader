import getFileList from '../help/getFileList';
import log from 'fancy-log';

/**
 * Загрузить директорию files в раздел файлов
 */
export default function uploadFiles() {
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
        if (e) log(e);
        resolve(e);
      })
  });
}
