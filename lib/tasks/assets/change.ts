import { parseObject, isRecord } from '../../help/errors';
import type { UploaderContext, Asset } from '../../types';
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
import { isDeepStrictEqual } from 'node:util';

function widgetData(directory: string) {
  const data = parseObject(fs.readFileSync(path.join(directory, 'info.json'), 'utf8'));
  for (const item of widgetFiles) {
    if (item.type === 'info') continue;
    const file = path.join(directory, item.fileName);
    if (fs.existsSync(file))
      data[item.uploadField || item.apiField] = fs.readFileSync(
        file,
        item.type === 'url' ? 'base64' : 'utf8',
      );
  }
  return data;
}

function widgetChanges(data: Record<string, unknown>, remote: Asset) {
  const changes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'type' || key === 'handle') continue;
    let comparable = value;
    // Downloads represent the API's localized name/description as {ru: text}.
    // Do not resubmit unchanged metadata: the read and write schemas differ
    // (e.g. widget_category_handle is returned but rejected by PUT).
    if (
      ['name', 'description'].includes(key) &&
      typeof remote[key] === 'string' &&
      isRecord(value) &&
      Object.keys(value).length === 1 &&
      typeof value.ru === 'string'
    )
      comparable = value.ru;
    const source = widgetFiles.some((file) => file.type === 'content' && file.apiField === key);
    const previous = source && remote[key] == null ? '' : remote[key];
    if (!isDeepStrictEqual(comparable, previous)) changes[key] = value;
  }
  return changes;
}
export default async function change(context: UploaderContext, fileAsset: Asset, log = true) {
  const localAssets = await sortAssetFolders(context, await updateAssets(context.options));
  const asset = localAssets[fileAsset.pathKey];
  const info = fileAsset.insalesInfo;
  if (info.type === 'Asset::Widget') {
    if (!widgetFiles.some((item) => item.fileName === info.name)) return fileAsset;
    if (asset && asset.id) {
      if (info.name === 'info.json') {
        const data = widgetChanges(widgetData(path.dirname(fileAsset.path)), asset);
        if (Object.keys(data).length === 0) return fileAsset;
        // Send changed metadata and sources together during bulk upload.
        const api = createClient(context.options.insalesApi);
        await api.editWidgetType({
          token: context.options.account.token,
          url: context.options.account.url,
          theme: context.options.theme.id,
          widgetId: asset.id,
          data,
        });
      } else {
        await editWidgetType(info, asset.id, asset.path, context.options, log);
      }
    } else {
      await uploadWidgetType(
        widgetData(path.dirname(fileAsset.path)),
        fileAsset.path,
        context.options,
        log,
      );
    }
  } else if (asset && asset.id) {
    await editAsset(info, asset.id, asset.path, context.options, log);
  } else {
    await uploadAsset(info, fileAsset.path, context.options, log);
  }
  return fileAsset;
}
