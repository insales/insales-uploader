import upath from 'upath';
import logger from '../logger';
import dynamicSort from '../help/dynamicSort';
import getInfoWidgetContent from '../help/getInfoWidgetContent';
import getPathKey from '../help/getPathKey';
import getExtention from '../help/getExtention';

/**
 * Получить список директорий для ассетов
 */
export default function sortAssetFolders (assets=[]) {
  const paths = this.paths;
  this.downloadList = [];

  return new Promise((resolve, reject) => {

    assets.sort(dynamicSort("type"));
    assets.reverse();

    for (let i = 0; i < assets.length; i++) {
      let asset = assets[i];
      if (typeof asset != 'object') {
        logger.error(asset);
        continue;
      }
      let typeDefault = asset.type;
      if (asset.handle) {
        asset.type = 'Asset::Widget'
      }

      let type = (asset.handle) ? 'Asset::Widget' : asset.type; // Тип ассета например 'Asset::Media'
      let name = (asset.handle) ? asset.handle : (asset.name || asset.inner_file_name);
      let folders = paths.folders;

      // дополняем стандартную информацию об ассете
      asset.isMedia = (asset.type === 'Asset::Media');
      asset.isRaw = /\.scss$|\.json$/.test(name) || (asset.type === 'Asset::Configuration');
      asset.pathMedia = '';
      asset.folder = upath.normalize( paths.assets[type]['folder'] );
      asset.backup = upath.normalize( paths.assets[type]['backup'] );

      if (!name) {
        logger.error(`Нет имя файла:`);
        console.log(asset);
        continue;
      }
      if (!asset.handle) {
        asset.name = name;
        let isMediaLiquid = asset.isMedia && (/\.liquid$/.test(name));
        let withouExt = (name.indexOf('.') === -1);
        let doubleLiquid = (typeof asset['human-readable-name'] == 'string' && asset['human-readable-name'].indexOf('.liquid.liquid') > -1);
        let snippetWithoutExt = (typeof asset['human-readable-name'] == 'string' && asset.type == 'Asset::Snippet' && name != asset['human-readable-name']);

        if (withouExt || doubleLiquid || snippetWithoutExt) {
          if (asset['human-readable-name']) {
            name = asset['human-readable-name'];
          }
        }

        if (isMediaLiquid) {
          asset.asset_url = null;
        }

        if (~name.indexOf('/') || ~name.indexOf('@')) {
          logger.error(`Недопустимое имя файла: ${name}`);
          name = name.replace(/@/g, '_');
        }


        asset.name = name;
        // Путь в соответствии со структурой Insales
        asset.path = upath.normalize( asset.folder + name );
        // Данный путь выступает в виде ключа (id)
        asset.pathKey = getPathKey(asset.path);

        asset.insalesInfo = {
          name: name,
          type: type
        }
        // Путь к бекапу
        asset.backupPath = upath.normalize( asset.backup + name );

        // Сортировка папки assets
        if (type === 'Asset::Media') {
          let assetFolder = paths.mediaExtension[ getExtention(name) ] || folders['media'];
          asset.pathMedia = upath.normalize( assetFolder + name );
        }



        // Список ассетов для работы с API
        this.assets[asset.pathKey] = asset;
        // Массив для скачивания
        this.downloadList.push(asset);
      }else{
        this.widgetFiles.forEach((item, i) => {
          let widgetType = Object.assign({}, asset)
          let widgetDir = widgetType.folder + name + '/';
          widgetType.path = upath.normalize( widgetDir + item.fileName );
          // Данный путь выступает в виде ключа (id)
          widgetType.pathKey = upath.normalize(widgetType.path);
          widgetType.widget_type = typeDefault;

          widgetType.insalesInfo = {
            name: item.fileName,
            apiField: item.apiField,
            type: type
          }
          // Путь к бекапу
          widgetType.backupPath = upath.normalize( widgetType.backup + item.fileName );

          if (item.type == 'content') {
            widgetType.content = widgetType[item.apiField];
          }
          if (item.type == 'url') {
            widgetType.asset_url = widgetType[item.apiField];
          }
          if (item.type == 'info') {
            widgetType.content = getInfoWidgetContent(widgetType, item.infoField);
          }
          // Список ассетов для работы с API
          this.assets[widgetType.pathKey] = widgetType;
          this.downloadList.push(widgetType);
        });
      }
    }

    resolve(this.assets);
  });
}
