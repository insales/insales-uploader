import glob_watcher from 'glob-watcher';
import log from 'fancy-log';
import vfs from 'vinyl-fs';
import picomatch from 'picomatch';
import pathModule from 'node:path';
import plumber from 'gulp-plumber';
import unlink from './unlink';
import change from './change';
import getInfo from './getInfo';
import fileValidation from '../help/fileValidation';
import getTypeFile from '../help/getTypeFile';

/**
 * Вотчер
 * @param  {array} paths  Пути к файлам
 * @param  {function} stream колбек который возвращает стрим
 */
export function watcher(paths = [], stream) {
  if (typeof stream == 'undefined') {
    log('Данный метод не предназначен для использования в терминале, используйте stream');
    return false;
  }
  const options = this.options;
  return glob_watcher(paths, options.chokidarOptions).on('all', (event, path)=> {
    if (typeof stream == 'function') {
      stream(this.src(path))
    }
  })
}

/**
 * Обертка над вотчером
 */
export async function startWatching(onUpdate) {
  const callOnUpdate = onUpdate || function () {};
  const paths = this.paths;
  const options = this.options;
  const onStreamUpdate = options.theme.onUpdate;

  if (this.watcherInstance) {
    await this.watcherInstance.close();
  }

  this.watcherInstance = glob_watcher(paths.toWatch, options.chokidarOptions);

  // обработчик add/edit
  const edit = (path, stat) => {
    let chainStream = defaultStream;
    chainStream = getChainStream(path, options.plugins);
    let ignore = options.plugins && options.plugins.exclude ? picomatch(options.plugins.exclude)(pathModule.basename(path)) : false;
    if (ignore || typeof chainStream !== 'function') {
      chainStream = defaultStream;
    }

    fileValidation(path)
      .then(() => {
        chainStream(vfs.src([path], {allowEmpty: true}).pipe(plumber()))
          .pipe(getInfo(this))
          .pipe(change(this, callOnUpdate, onStreamUpdate))
          .on('error', err => log(err))
          .resume();
      })
      .catch(err => {
        log(err);
      })
  }

  // обработчик удаления
  const remove = (path) => {
    unlink(path, this, false, callOnUpdate, onStreamUpdate).catch(err => log(err));
  }

  this.watcherInstance
    .on('unlink', remove)
    .on('add', edit)
    .on('change', edit);

  await new Promise((resolve, reject) => {
    const ready = () => { this.watcherInstance.removeListener('error', failed); resolve(); };
    const failed = error => { this.watcherInstance.removeListener('ready', ready); reject(error); };
    this.watcherInstance.once('ready', ready).once('error', failed);
  });
  this.watcherInstance.on('error', error => log(error));
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

export async function stopWatching() {
  if (this.sessionSignalHandler) {
    process.removeListener('SIGINT', this.sessionSignalHandler);
    this.sessionSignalHandler = null;
  }
  if (this.watcherInstance) {
    await this.watcherInstance.close();
    this.watcherInstance = null;
  }
}
