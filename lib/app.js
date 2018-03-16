'use strict';
import InsalesApi from 'insales';
import taskManager from './taskManager';
import mergeOptions from './options/mergeOptions';
import { getPaths } from './options/getProjectPaths';
import getFileInfo from './help/getFileInfo';
import {EventEmitter} from 'events';
import updateAssets from './insalesApi/updateAssets';
import downloadTheme from './api/downloadTheme';
import downloadFiles from './api/downloadFiles';
import pull from './api/pull';
import upload from './api/upload';
import uploadFiles from './api/uploadFiles';
import initAssets from './api/initAssets';
import backup from './api/backup';
import vfs from 'vinyl-fs';
import watch from './api/watch.js';
import initAssetManager from './tasks/assets';
import {startWatching,stopWatching,watcher} from './watcher';
import getInfo from './watcher/getInfo';
import unlink from './watcher/unlink';
import change from './watcher/change';
import chain from 'gulp-chain';
import plumber from 'gulp-plumber';

class InSalesUploader {
  constructor(options){
    this.options = options;
    this.eventEmitter = new EventEmitter(); // Общая шина событий
    this.options = mergeOptions(options); // слияние настроек с дефолтом
    this.paths = getPaths(this.options); // пути относительно корневой директории
    this.assets = {}; // информация обо всех локальных ассетах
    this.downloadList = []; // массив файлов для загрузки
    this.TaskManager = new taskManager();

    initAssetManager.apply(this);
  }

  getFileInfo (file, withContent) {
    return getFileInfo.apply(this, [file, withContent]);
  }
  downloadFiles () {
    return downloadFiles.apply(this);
  }
  download (type) {
    return downloadTheme.apply(this, [type]);
  }
  downloadTemplates () {
    return downloadTheme.apply(this, [["Asset::Template"]]);
  }
  downloadSnippets () {
    return downloadTheme.apply(this, [["Asset::Snippet"]]);
  }
  downloadConfig () {
    return downloadTheme.apply(this, [["Asset::Configuration"]]);
  }
  downloadMedia () {
    return downloadTheme.apply(this, [["Asset::Media"]]);
  }
  pull () {
    return pull.apply(this, [this.paths]);
  }
  pullTheme () {
    console.log('pullTheme [DEPRECATION]. Use pull!');
    return pull.apply(this, [this.paths]);
  }
  upload () {
    return upload.apply(this);
  }
  uploadFiles () {
    return uploadFiles.apply(this);
  }
  pushTheme () {
    console.log('pushTheme [DEPRECATION]. Use upload!');
    return upload.apply(this);
  }
  start(callback) {
    return downloadTheme.apply(this).then(() => {
      return startWatching.apply(this, [callback]);
    })
  }
  stopStream () {
    return stopWatching.apply(this);
  }
  initAssets () {
    return initAssets.apply(this, [this.paths]);
  }
  backup () {
    return backup.apply(this, [this.paths]);
  }
  stream (callback) {
    return watch.apply(this, [callback]);
  }
  watch (paths, streamFiles) {
    return watcher.apply(this, [paths, streamFiles]);
  }

  src (path) {
    unlink(path, this, true);
    return vfs.src(path, {allowEmpty: true})
              .pipe(plumber())
  }

  triggerFile (event, path) {
    console.log('triggerFile [DEPRECATION]. Use src and dest!');
    return this.src(path)
               .pipe(this.dest());
  }

  dest() {
    return (chain((stream) => {
      return stream
              .pipe(getInfo(this))
              .pipe(change(this));
    }))();
  }
}

export default options => new InSalesUploader(options);
