import getAsset from '../../insalesApi/getAsset';
import getWidgetType from '../../insalesApi/getWidgetType';
export default async function download(asset) {
  await (asset.type === 'Asset::Widget' ? getWidgetType : getAsset).call(this, asset);
  return asset;
}
