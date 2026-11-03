import log from '../logger/log';
import updateAssets from '../insalesApi/updateAssets';
import sortAssetFolders from '../options/sortAssetFolders';
import checkLocalAssets from './checkLocalAssets';
import createDir from '../file-system/createDir';
import type { UploaderContext, AssetType } from '../types';
export default async function downloadTheme(
  context: UploaderContext,
  types?: AssetType[],
): Promise<UploaderContext> {
  log('theme:download:start');
  await createDir(context.paths);
  await sortAssetFolders(context, await updateAssets(context.options));
  const assets = types
    ? context.downloadList.filter((asset) => types.includes(asset.insalesInfo.type))
    : context.downloadList;
  await context.TaskManager.run('asset:download', assets, {
    template: 'Downloading: :name [:bar] :percent',
  });
  if (context.options.theme.assetsSync) await context.initAssets();
  if (context.options.theme.backup) await context.backup();
  await checkLocalAssets(context);
  log('theme:download:finish');
  return context;
}
