import fs from 'node:fs';
import path from 'node:path';
import editAsset from '../../insalesApi/editAsset';
import uploadAsset from '../../insalesApi/uploadAsset';
import editWidgetType from '../../insalesApi/editWidgetType';
import uploadWidgetType from '../../insalesApi/uploadWidgetType';
import updateAssets from '../../insalesApi/updateAssets';
import sortAssetFolders from '../../options/sortAssetFolders';
import widgetFiles from '../../options/widgetFiles';
import createClient from '../../insalesApi/client';

function widgetData(directory) {
  const data = JSON.parse(fs.readFileSync(path.join(directory, 'info.json'), 'utf8'));
  for (const item of widgetFiles) {
    if (item.type === 'info') continue;
    const file = path.join(directory, item.fileName);
    if (fs.existsSync(file)) data[item.uploadField || item.apiField] = fs.readFileSync(file, item.type === 'url' ? 'base64' : 'utf8');
  }
  return data;
}
export default async function change(fileAsset, log = true) {
  const localAssets = await sortAssetFolders.call(this, await updateAssets(this.options));
  const asset = localAssets[fileAsset.pathKey];
  const info = fileAsset.insalesInfo;
  if (info.type === 'Asset::Widget') {
    if (!widgetFiles.some(item => item.fileName === info.name)) return fileAsset;
    if (asset && asset.id) {
      if (info.name === 'info.json') {
        const data = widgetData(path.dirname(fileAsset.path));
        delete data.type;
        delete data.handle;
        // Send the complete widget, including its source files, during bulk upload.
        const api = createClient(this.options.insalesApi);
        await api.editWidgetType({token: this.options.account.token, url: this.options.account.url, theme: this.options.theme.id, widgetId: asset.id, data});
      } else {
        await editWidgetType(info, asset.id, asset.path, this.options, log);
      }
    } else {
      await uploadWidgetType(widgetData(path.dirname(fileAsset.path)), fileAsset.path, this.options, log);
    }
  } else if (asset && asset.id) {
    await editAsset(info, asset.id, asset.path, this.options, log);
  } else {
    await uploadAsset(info, fileAsset.path, this.options, log);
  }
  return fileAsset;
}
