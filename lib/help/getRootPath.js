const appRoot = require('app-root-path');
const upath = require('upath');
const fs = require('fs');

/**
 * Получить директорию с insales-uploader
 */
export default function getRootPath() {
  let root = upath.normalize(appRoot.path + '/node_modules/insales-uploader/');

  try {
    let stat = fs.statSync(upath.normalize(appRoot.path + '/package.json'));
    root = appRoot.path;
  } catch (e) {
    //Файла не существует
  }

  return root;
}
