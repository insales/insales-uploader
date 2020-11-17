'use strict';
import log from 'fancy-log';
import updateAssets from '../insalesApi/updateAssets';
import getAssets from '../insalesApi/getAssets';
import createDir from '../file-system/createDir';
import testOnline from '../help/testOnline';
import sortAssetFolders from '../options/sortAssetFolders';
import checkLocalAssets from './checkLocalAssets';

/**
 * Скачать ассеты
 * @param  {array} typeAssets типы ассетов для скачивания ["Asset::Template", "Asset::Snippet", "Asset::Configuration", "Asset::Media"]
 */
export default function downloadTheme (typeAssets) {
  const action = {
    method: 'download'
  }

  const options = this.options;

  log('theme:download:start');

  return new Promise((resolve, reject) => {

    testOnline('Не удалось скачать тему. Отсутствует соединение с интернетом!')
      .then(()=> {
        return createDir(options, this.paths, action);
      })
      .then(() => {
        return updateAssets(options);
      })
      .then(assets => {
        return sortAssetFolders.apply(this, [assets]);
      })
      .then(() => {
        return getAssets.apply(this, [typeAssets]);
      })
      .then(() => {
        if (this.options.theme.assetsSync) {
          return this.initAssets();
        }else{
          return Promise.resolve();
        }
      })
      .then(() => {
        if (this.options.theme.backup) {
          return this.backup();
        }else{
          return Promise.resolve();
        }
      })
      .then(() => {
        return checkLocalAssets.apply(this);
      })
      .then(() => {
        log('theme:download:finish');
        resolve(this);
      })
      .catch((e) => {
        if (e && e.msg) {
          log(e.msg);
        }
        console.log(e);
        reject(this);
      })
  });
};
