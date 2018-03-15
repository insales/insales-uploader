import glob_watcher from 'glob-watcher';
import log from 'fancy-log';
import vfs from 'vinyl-fs';
import upath from 'upath';
import unlink from './unlink';
import change from './change';
import getInfo from './getInfo';
import fileValidation from '../help/fileValidation';

const watchOptions = {
  ignored: /[\/\\]\./,
  ignoreInitial: true,
  followSymlinks: true,
  usePolling: true,
  interval: 200,
  delay: 0,
  binaryInterval: 300,
  alwaysStat: true,
  depth: 99,
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 100
  },
  ignorePermissionErrors: true
}

export function watcher(paths) {
  return glob_watcher(paths, watchOptions)
}

export function startWatching(onUpdate) {
  const callOnUpdate = onUpdate || function () {};
  return new Promise((resolve, reject) => {
    const paths = this.paths;
    const options = this.options;
    const assets = this.assets;
    const eventEmitter = this.eventEmitter;

    if (this.watcherInstance) {
      this.watcherInstance.close();
    }

    this.watcherInstance = glob_watcher(paths.toWatch, watchOptions);

    // обработчик add/edit
    const edit = (path, stat) => {
      fileValidation(path)
        .then(() => {
          vfs.src([path], {allowEmpty: true})
            .pipe(getInfo(this))
            .pipe(change(this, callOnUpdate))
        })
        .catch(err => {
          log(err);
        })
    }

    // обработчик удаления
    const remove = (path) => {
      unlink(path, this, false, callOnUpdate)
    }

    this.watcherInstance
      .on('add', edit)
      .on('change', edit)
      .on('unlink', remove);

    eventEmitter.on('stop:watching:theme', () => {
      this.watcherInstance.close();
    });

    resolve()
  });
}

export function stopWatching() {
  return new Promise((resolve, reject) => {
    const eventEmitter = this.eventEmitter;

    eventEmitter.emit('stop:watching:theme');
    log('stop:watching:theme');

    resolve()
  });
}
