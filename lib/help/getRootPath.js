const upath = require('upath');

/**
 * Получить директорию с insales-uploader
 */
export default function getRootPath() {
  return upath.normalize(__dirname + '/../..');
}
