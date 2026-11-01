import removeAsset from '../../insalesApi/removeAsset';
import removeWidgetType from '../../insalesApi/removeWidgetType';
import editWidgetType from '../../insalesApi/editWidgetType';
import updateAssets from '../../insalesApi/updateAssets';
import sortAssetFolders from '../../options/sortAssetFolders';
export default async function remove(fileAsset, log = true) {
  const assets = await sortAssetFolders.call(this, await updateAssets(this.options));
  const asset = assets[fileAsset.pathKey];
  if (!asset || !asset.id) return;
  if (asset.type === 'Asset::Widget') {
    if (asset.insalesInfo.name !== 'info.json') {
      return editWidgetType({...asset.insalesInfo, content: '', base64: ''}, asset.id, asset.path, this.options, log);
    }
    await removeWidgetType(asset.id, asset.path, this.options, assets, log);
    for (const [key, entry] of Object.entries(assets)) if (entry.type === 'Asset::Widget' && entry.id === asset.id) delete assets[key];
  } else {
    await removeAsset(asset.id, asset.path, this.options, assets, log);
  }
}
