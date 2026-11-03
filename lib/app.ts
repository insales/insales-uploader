import { EventEmitter } from 'node:events';
import { TaskManager } from './taskManager';
import mergeOptions from './options/mergeOptions';
import widgetFiles from './options/widgetFiles';
import { getPaths } from './options/getProjectPaths';
import getFileInfo from './help/getFileInfo';
import listThemes from './api/listThemes';
import downloadTheme from './api/downloadTheme';
import downloadFiles from './api/downloadFiles';
import pull from './api/pull';
import upload from './api/upload';
import uploadFiles from './api/uploadFiles';
import initAssets from './api/initAssets';
import backup from './api/backup';
import watch from './api/watch';
import initAssetManager from './tasks/assets';
import { FileService } from './tasks/file';
import { FileWatcher } from './watcher';
import { SessionTime } from './tools/sessionTime';
import log from './logger/log';
import type {
  UploaderOptions,
  Asset,
  AssetTasks,
  AssetType,
  FileInput,
  FileInfo,
  UpdateCallback,
  UploaderContext,
} from './types';
export class InSalesUploader implements UploaderContext {
  readonly options;
  readonly paths;
  readonly eventEmitter = new EventEmitter();
  assets: Record<string, Asset> = {};
  downloadList: Asset[] = [];
  readonly widgetFiles = widgetFiles.map((file) => ({
    ...file,
    infoField: file.infoField?.slice(),
  }));
  readonly TaskManager = new TaskManager<AssetTasks>();
  readonly files = new FileService();
  readonly watcherService: FileWatcher;
  readonly session = new SessionTime();
  constructor(options: UploaderOptions) {
    this.options = mergeOptions(options);
    this.paths = getPaths(this.options);
    this.watcherService = new FileWatcher(this, (error) => {
      log(error);
      this.eventEmitter.emit('watchError', error);
    });
    initAssetManager(this);
  }
  getFileInfo(file: FileInput, withContent = false): FileInfo {
    return getFileInfo(this, file, withContent);
  }
  listThemes() {
    return listThemes(this);
  }
  downloadFiles() {
    return downloadFiles(this);
  }
  async download(types?: AssetType[]): Promise<this> {
    await downloadTheme(this, types);
    return this;
  }
  downloadTemplates() {
    return this.download(['Asset::Template']);
  }
  downloadSnippets() {
    return this.download(['Asset::Snippet']);
  }
  downloadConfig() {
    return this.download(['Asset::Configuration']);
  }
  downloadMedia() {
    return this.download(['Asset::Media']);
  }
  async pull(): Promise<this> {
    await pull(this);
    return this;
  }
  pullTheme() {
    return this.pull();
  }
  upload() {
    return upload(this);
  }
  uploadFiles() {
    return uploadFiles(this);
  }
  pushTheme() {
    return this.upload();
  }
  async start(callback?: UpdateCallback): Promise<this> {
    await this.download();
    await this.stream(callback);
    return this;
  }
  async stopStream(): Promise<void> {
    this.session.stop();
    await this.watcherService.stop();
  }
  initAssets() {
    return initAssets(this);
  }
  backup() {
    return backup(this);
  }
  async stream(callback?: UpdateCallback): Promise<this> {
    await watch(this, callback);
    return this;
  }
}
export interface UploaderFactory {
  (options: UploaderOptions): InSalesUploader;
  new (options: UploaderOptions): InSalesUploader;
}
const createUploader = function (options: UploaderOptions) {
  return new InSalesUploader(options);
} as UploaderFactory;
export default createUploader;
