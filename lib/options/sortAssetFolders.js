import upath from 'upath';
import logger from '../logger';
import dynamicSort from '../help/dynamicSort';
import getPathKey from '../help/getPathKey';
import getExtention from '../help/getExtention';

export default function sortAssetFolders (assets) {
  const paths = this.paths;

  return new Promise((resolve, reject) => {

    assets.sort(dynamicSort("type"));
    assets.reverse();

    for (let i = 0; i < assets.length; i++) {
      let asset = assets[i];
      let type = asset.type; // Тип ассета например 'Asset::Media'
      let name = asset.name;
      let folders = paths.folders;

      // дополняем стандартную информацию об ассете
      asset.isMedia = (asset.type === 'Asset::Media');
      asset.pathMedia = '';
      asset.name = name;
      asset.folder = upath.normalize( paths.assets[type]['folder'] );
      asset.backup = upath.normalize( paths.assets[type]['backup'] );

      // Для сниппетов (для файлов без расширения)
      if (name.indexOf('.') === -1) {
        asset['name'] = asset['human-readable-name'];
      }

      // Путь в соответствии со структурой Insales
      asset.path = upath.normalize( asset.folder + asset['name'] );
      // Данный путь выступает в виде ключа (id)
      asset.pathKey = getPathKey(asset.path);
      asset.insalesInfo = {
        name: asset['name'],
        type: type
      }
      // Путь к бекапу
      asset.backupPath = upath.normalize( asset.backup + asset['name'] );

      // Сортировка папки assets
      if (type === 'Asset::Media') {
        let assetFolder = paths.mediaExtension[ getExtention(name) ] || folders['media'];
        asset.pathMedia = upath.normalize( assetFolder + asset['name'] );
      }

      if (~asset['name'].indexOf('/') || ~asset['name'].indexOf('@')) {
        logger.error(`Недопустимое имя файла: ${asset['name']}`);
      }

      // Список ассетов для работы с API
      this.assets[asset.pathKey] = asset;
      // Массив для скачивания
      this.downloadList.push(asset);
    }

    resolve(this.assets);
  });
}
