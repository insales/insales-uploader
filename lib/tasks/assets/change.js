import editAsset from '../../insalesApi/editAsset';
import uploadAsset from '../../insalesApi/uploadAsset';
import editWidgetType from '../../insalesApi/editWidgetType';
import uploadWidgetType from '../../insalesApi/uploadWidgetType';
import updateAssets from '../../insalesApi/updateAssets';
import sortAssetFolders from '../../options/sortAssetFolders';

/**
 * Задача для изменения или загрузки ассета на сервере
 */
export default function change(fileAsset, log = true) {
  const instance = this;
  const options = instance.options;

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      let editMethod = (fileAsset.type == 'Asset::Widget') ? editWidgetType : editAsset;
      let uploadMethod = (fileAsset.type == 'Asset::Widget') ? uploadWidgetType : uploadAsset;

      updateAssets(options, fileAsset.type).then(serverAssets => {
        return sortAssetFolders.apply(instance, [serverAssets]);
      })
      .then(localAssets => {
        const asset = (fileAsset.pathKey) ? (localAssets[fileAsset.pathKey]) : null;
        if (asset && asset.id) {
          editMethod(fileAsset.insalesInfo, asset.id, asset.path, options, log)
            .then(() => {
              return resolve(fileAsset);
            });
        }else{
          uploadMethod(fileAsset.insalesInfo, fileAsset.path, options, log)
            .then(() => {
              return resolve(fileAsset)
            });
        }
      });

    }, 0)
  });
}
