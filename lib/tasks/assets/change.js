import editAsset from '../../insalesApi/editAsset';
import uploadAsset from '../../insalesApi/uploadAsset';
import updateAssets from '../../insalesApi/updateAssets';
import sortAssetFolders from '../../options/sortAssetFolders';

/**
 * Задача для изменения или загрузки ассета на сервере
 */
export default function change(fileAsset, log = true) {
  const instance = this;
  const options = instance.options;

  return new Promise((resolve, reject) => {
    updateAssets(options).then(serverAssets => {
      return sortAssetFolders.apply(instance, [serverAssets]);
    })
    .then(localAssets => {
      const asset = (fileAsset.pathKey) ? (localAssets[fileAsset.pathKey]) : null;
      if (asset && asset.id) {
        editAsset(fileAsset.insalesInfo, asset.id, asset.path, options, log)
        .then(() => {
          return resolve(fileAsset);
        });
      }else{
        uploadAsset(fileAsset.insalesInfo, fileAsset.path, options, log)
          .then(() => {
            return resolve(fileAsset)
          });
      }
    });
  });
}
