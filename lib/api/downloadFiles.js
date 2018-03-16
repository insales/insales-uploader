'use strict';
import log from 'fancy-log';
import testOnline from '../help/testOnline';
import listFile from '../insalesApi/listFile';
import DownloadManager from '../tasks/file';
import mkdirp from 'mkdirp';

/**
 * Скачать файлы темы
 */
export default function downloadFiles() {
  const options = this.options;
  const paths = this.paths;

  log('files:download:start');

  return new Promise((resolve, reject) => {
    testOnline('Не удалось скачать тему. Отсутствует соединение с интернетом!')
    .then(()=> {
      return listFile(options, paths);
    })
    .then((files)=> {
      mkdirp.sync(paths.files);

      return new Promise((resolve, reject) => {
        DownloadManager.run('file:writeWithDownload', files, {
          template: 'Downloading: :name [:bar] :percent'
        }).then(() => {
          log('files:download:finish');
          resolve()
        });
      });
    })
    .catch((e) => {
      if (e && e.msg) {
        log(e.msg);
      }
      reject(this);
    })
  })
}
