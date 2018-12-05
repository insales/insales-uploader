import fs from 'fs';
import upath from 'upath';
import cpFile from 'cp-file';
import fileMissing from '../help/fileMissing.js';
const jsdiff = require('diff');

/**
 * Синхронизировать измененные ассеты
 */
export function syncChange(instance, file, cllbck) {
  if (instance.options.theme.assetsSync) {
    if (!cllbck) cllbck = ()=>{};

    let fileInfo = instance.getFileInfo(file, true);
    let syncPath = testFileSychro(fileInfo);
    syncFile(fileInfo, syncPath, instance, file);

    cllbck()
  }else{
    cllbck();
  }
}

// синхронизация удаления
export function syncUnlink(instance, pathToUnlink, cllbck) {
  if (pathToUnlink && instance.options.theme.assetsSync) {
    if (!cllbck) cllbck = ()=>{};

    let fileInfo = instance.getFileInfo({path: pathToUnlink}, false);
    let syncPath = testFileSychro(fileInfo);
    if (syncPath) {
      fileMissing(syncPath)
        .catch(()=>{
          try {
            fs.unlinkSync(syncPath);
            cllbck(fileInfo.isAsset)
          } catch (e) {
            cllbck(fileInfo.isAsset)
            return;
          }
        })
    }else{
      cllbck(fileInfo.isAsset)
    }
  }else{
    cllbck();
  }
}

// Получить путь для синхронизации
function testFileSychro(FileInfo) {
  let syncPath = null;
  let asset = FileInfo.asset;

  if (asset.insalesInfo.type == 'Asset::Media') {
    syncPath = (upath.normalize(FileInfo.path).localeCompare(asset.pathKey) === 0) ? asset.pathMedia : asset.pathKey;
  }

  return syncPath;
}

// Синхронизировать файл
function syncFile(fileInfo, syncPath, instance, file) {
  if (!syncPath) {
    return false;
  }
  let syncFileInfo = instance.getFileInfo({path: syncPath}, true);
  let fileProps = fileInfo.insalesInfo
  let syncFileProps = syncFileInfo.insalesInfo;
  let prop = (typeof fileInfo.insalesInfo.content === 'string') ? 'content' : 'attachment';
  let isString = (typeof syncFileProps[prop] === 'string' && typeof fileProps[prop] === 'string');
  let identSize = false;

  if (isString) {
    let stats1 = fs.statSync(file.path)
    let stats2 = fs.statSync(syncPath)
    let fileSizeInBytes1 = Number(stats1.size);
    let fileSizeInBytes2 = Number(stats2.size);

    identSize = fileSizeInBytes2 === fileSizeInBytes1;
  }

  // true если синхронизован
  let isSync = identSize;

  // проверить идентичные по размеру файлы на различие в символах
  if (isString) {
    if (identSize) {
      isSync = jsdiff.diffChars(fileProps[prop], syncFileProps[prop]).length === 0;
    }
  }

  if (isString) {
    if (!isSync) {
      if (syncFileProps[prop] === '') {
        isSync = (syncFileProps[prop] === '' && fileProps[prop] === '');
      }else{
        isSync = (syncFileProps[prop] === fileProps[prop]);
      }
    }
  }


  if (!isSync) {
    cpFile.sync(file.path, syncPath);
    return isSync;
  }
}
