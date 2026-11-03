import getAsset from '../../insalesApi/getAsset';
import getWidgetType from '../../insalesApi/getWidgetType';
import type { UploaderContext, Asset } from '../../types';
export default function download(context: UploaderContext, asset: Asset) {
  return asset.type === 'Asset::Widget' ? getWidgetType(context, asset) : getAsset(context, asset);
}
