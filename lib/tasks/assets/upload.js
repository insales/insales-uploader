import change from './change';
import remove from './remove';
export default function upload(asset) {
  return (asset.uploadType === 'remove' ? remove : change).call(this, asset, false);
}
