const appRoot = require('app-root-path');
const upath = require('upath');

/**
 * Получить директорию с insales-uploader
 */
export default function getRootPath() {
  let root = appRoot.path;
  if (appRoot.path.indexOf('insales-uploader') === -1) {
    root = upath.normalize(appRoot.path + '/node_modules/insales-uploader/');
  }
  return root;
}
