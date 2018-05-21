import { rootPath } from 'get-root-path';
const appRoot = require('app-root-path');
const upath = require('upath');
const fs = require('fs');

/**
 * Получить директорию с insales-uploader
 */
export default function getRootPath() {
  let root = appRoot.path;

  try {
    let stat = fs.statSync(upath.normalize(appRoot.path + '/package.json'));
    root = appRoot.path;
  } catch (e) {
    //Файла не существует
  }

  try {
    let stat = fs.statSync(upath.normalize(rootPath + '/package.json'));
    root = rootPath;
  } catch (e) {
    //Файла не существует
  }

  return root;
}
