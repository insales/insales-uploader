import uploadFile from '../../insalesApi/uploadFile';
import type { UploaderContext, Asset } from '../../types';
export default function pushFile(context: UploaderContext, asset: Asset) {
  return uploadFile(
    { filename: asset.insalesInfo.name, attachment: asset.insalesInfo.base64 ?? '' },
    asset.path,
    context.options,
  );
}
