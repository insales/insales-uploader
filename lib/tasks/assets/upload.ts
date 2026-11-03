import change from './change';
import remove from './remove';
import type { UploaderContext, Asset } from '../../types';
export default function upload(context: UploaderContext, asset: Asset) {
  return asset.uploadType === 'remove' ? remove(context, asset) : change(context, asset);
}
