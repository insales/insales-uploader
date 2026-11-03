import type { UploaderContext, Asset } from '../../types';
import editAsset from '../../insalesApi/editAsset';
import uploadAsset from '../../insalesApi/uploadAsset';
import updateAssets from '../../insalesApi/updateAssets';
import sortAssetFolders from '../../options/sortAssetFolders';
import changeWidget from './changeWidget';

export default async function change(context: UploaderContext, localAsset: Asset, log = true) {
  const remoteAssets = await updateAssets(context.options);
  const assetsByPath = await sortAssetFolders(context, remoteAssets);
  const remoteAsset = assetsByPath[localAsset.pathKey];
  const info = localAsset.insalesInfo;

  if (info.type === 'Asset::Widget') {
    await changeWidget(context.options, localAsset, remoteAsset, log);
  } else if (remoteAsset?.id) {
    await editAsset(info, remoteAsset.id, remoteAsset.path, context.options, log);
  } else {
    await uploadAsset(info, localAsset.path, context.options, log);
  }

  return localAsset;
}
