import glob_watcher from 'glob-watcher';
import log from 'fancy-log';
import vfs from 'vinyl-fs';
import chain from 'gulp-chain';
import upath from 'upath';
import matcher from 'matcher';
import plumber from 'gulp-plumber';
import unlink from './unlink';
import change from './change';
import getInfo from './getInfo';
import fileValidation from '../help/fileValidation';
import getTypeFile from '../help/getTypeFile';

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

/**
 * Вотчер
 * @param  {array} paths  Пути к файлам
 * @param  {function} stream колбек который возвращает стрим
 */
export function watcher(paths, stream) {
  return glob_watcher(paths, watchOptions).on('all', (event, path)=> {
    stream(this.src (path))
  })
}

/**
 * Обертка над вотчером
 */
export function startWatching(onUpdate) {
  const callOnUpdate = onUpdate || function () {};
  return new Promise((resolve, reject) => {
    const paths = this.paths;
    const options = this.options;
    const assets = this.assets;
    const eventEmitter = this.eventEmitter;
    const onStreamUpdate = options.theme.onUpdate;

    if (this.watcherInstance) {
      this.watcherInstance.close();
    }

    this.watcherInstance = glob_watcher(paths.toWatch, watchOptions);

    // обработчик add/edit
    const edit = (path, stat) => {
      let chainStream = defaultStream;
      chainStream = getChainStream(path, options.plugins);
      let ignore = (options.plugins && options.plugins.exclude) ? matcher([path], options.plugins.exclude).length > 0 : false;
      if (ignore || typeof chainStream !== 'function') {
        chainStream = defaultStream;
      }

      fileValidation(path)
        .then(() => {
          vfs.src([path], {allowEmpty: true})
            .pipe(plumber())
            .pipe(chain(chainStream)())
            .pipe(getInfo(this))
            .pipe(change(this, callOnUpdate, onStreamUpdate))
        })
        .catch(err => {
          log(err);
        })
    }

    // обработчик удаления
    const remove = (path) => {
      unlink(path, this, false, callOnUpdate, onStreamUpdate)
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


let defaultStream = (stream) => {
  return stream
}

/**
 * Получить функцию с плагинами
 */
function getChainStream(path, plugins) {
  let typeFile = getTypeFile(path);
  let stream = defaultStream;

  switch (typeFile) {
    case 'style':
      if (plugins.style) stream = plugins.style;
      break;
    case 'script':
      if (plugins.script) stream = plugins.script;
      break;
    case 'svg':
      if (plugins.svg) stream = plugins.svg;
      break;
    case 'img':
      if (plugins.img) stream = plugins.img;
      break;
    case 'font':
      if (plugins.font) stream = plugins.font;
      break;
    case 'media':
      if (plugins.media) stream = plugins.media;
      break;
    default:
    // defaultStream
  }

  return stream;
}

export function stopWatching() {
  return new Promise((resolve, reject) => {
    const eventEmitter = this.eventEmitter;

    eventEmitter.emit('stop:watching:theme');
    log('stop:watching:theme');

    resolve()
  });
}
