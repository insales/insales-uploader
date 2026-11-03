import fs from 'node:fs';
import path from 'node:path';
import checkLocalAssets from './checkLocalAssets';
import updateAssets from '../insalesApi/updateAssets';
import sortAssetFolders from '../options/sortAssetFolders';
import log from '../logger/log';
import type { UploaderContext, Asset } from '../types';
export default async function upload(context: UploaderContext): Promise<void> {
  log('theme:upload:start');
  await sortAssetFolders(context, await updateAssets(context.options));
  const diff = await checkLocalAssets(context, false);
  const tasks: Asset[] = [];
  for (const file of diff.serverError) {
    const info = context.getFileInfo({ path: file }, true);
    if (!info.isDirectory) tasks.push({ ...info.asset, uploadType: 'upload' });
  }
  for (const asset of context.downloadList) {
    if (asset.type === 'Asset::Widget') continue;
    if (diff.localError.includes(asset.pathKey)) tasks.push({ ...asset, uploadType: 'remove' });
    else {
      const info = context.getFileInfo({ path: asset.pathKey }, true);
      if (!info.isDirectory) tasks.push({ ...info.asset, uploadType: 'edit' });
    }
  }
  if (fs.existsSync(context.paths.widget_types)) {
    for (const entry of fs.readdirSync(context.paths.widget_types, { withFileTypes: true })) {
      const file = path.join(context.paths.widget_types, entry.name, 'info.json');
      if (entry.isDirectory() && fs.existsSync(file))
        tasks.push(context.getFileInfo({ path: file }, true).asset);
    }
  }
  await context.TaskManager.run('asset:upload', tasks, { template: 'Uploading: [:bar] :percent' });
  log('theme:upload:finish');
}
