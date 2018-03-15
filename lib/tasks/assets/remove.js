import removeAsset from '../../insalesApi/removeAsset';
import updateAssets from '../../insalesApi/updateAssets';
import sortAssetFolders from '../../options/sortAssetFolders';

export default function remove(fileAsset, log = true) {
  const instance = this;

  return new Promise((resolve, reject) => {
    updateAssets(instance.options).then(serverAssets => {
      return sortAssetFolders.apply(instance, [serverAssets]);
    })
    .then(instanceAssets => {
      const asset = (fileAsset.pathKey) ? instanceAssets[fileAsset.pathKey] : null;

      if (asset && asset.id && asset.path) {
        removeAsset(asset.id, asset.path, instance.options, instance.assets, log).then(()=>{
          delete instanceAssets[fileAsset.pathKey];
          resolve();
        })
      }else{
        resolve();
      }
    });
  });
}
