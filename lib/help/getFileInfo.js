import upath from 'upath';
import fs from 'fs';
import isBinary from 'is-binary-buffer';
import removeEtx from './removeEtx';
import getAssetType from './getAssetType';
import getPathKey from './getPathKey';
import getExtention from './getExtention';

/**
* Получить информацию об ассете и привязать её к входному объекту file
* @param  {object}  file          Объект файла
* @param  {Boolean} withContent Извлекать поле контент?
*/
export default function getFileInfo(file, withContent) {
  const assets = this.assets;
  const paths = this.paths;
  file.path = upath.normalize(file.path);

  // insalesInfo - информация для insales API
  const insalesInfo = getInsalesInfo(file.path);

  if (withContent) {
    getContent(insalesInfo, file)
  }

  file.asset = getAssetInfo(file.path, assets)
  file.insalesInfo = insalesInfo;
  file.asset.insalesInfo = insalesInfo;
  file.asset.pathMedia = getPathMedia(insalesInfo.name, paths);
  file.isAsset = (upath.normalize(file.path).localeCompare(file.asset.pathMedia) == 0);

  return file;
}

/**
* Получить информацию об ассете для запросов в api
* @param  {string} path путь к файлу
*/
function getInsalesInfo(path) {
  const pathNormalize = upath.normalize(path);
  const parentDir = upath.dirname(pathNormalize).split('/').pop();
  const type = getAssetType(parentDir);
  const name = upath.basename(pathNormalize);

  return {
    name,
    type
  }
}

/**
 * Получить путь к директории ассетов (нужно для синхронизации)
 */
function getPathMedia(name, paths) {
  let pathMedia = false;
  let assetFolder = paths.mediaExtension[ getExtention(name) ];
  if (assetFolder) {
    pathMedia = upath.normalize( assetFolder + name );
  }

  return pathMedia;
}

/**
* Получить поля контента в зависимости от кодировки файла
* @param  {object} insalesInfo объект который передается в апи в качестве параметровы
* @param  {object} file        информация о файле
*/
function getContent(insalesInfo, file) {
  let content = readContent(file);

  if (!content) {
    return false;
  }

  file._contents = content;
  file.contents = content;

  const canMutable = isBinary(file.contents) === false;
  // Если файл не бинарный то можно проверять на лишние спец. символы
  if (canMutable) {
    let mutableContent = file._contents.toString('utf8');
    insalesInfo.content = removeEtx(mutableContent, insalesInfo.name);
  }else{
    insalesInfo.attachment = file._contents.toString('base64');
  }
}

/**
* Получить контент файла
* @param  {object} file Объект с информацией о файле
* @return {buffer}      контент файла
*/
function readContent(file) {
  if (typeof file.contents == 'undefined') {
    let contents = false;

    try {
      contents = fs.readFileSync(file.path)
    } catch (e) {
      //console.log(e);
      //Файла не существует
    }

    return contents;
  }

  return file.contents;
}

/**
* Получить информацию об ассете из общего списка, иначе заполнить обязательные поля
* @param {string} path   путь к файлу
* @param {object} assets информация об ассете
*/
function getAssetInfo(path, assets) {
  const pathKey = getPathKey(path);
  let asset = assets[pathKey];

  if (typeof asset == 'undefined') {
    asset = {};
    asset.path = upath.normalize(path);
  }

  asset.pathKey = pathKey;

  return asset;
}
