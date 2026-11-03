import path from 'node:path';
import type { Asset, NormalizedOptions } from '../../types';
import createClient from '../../insalesApi/client';
import editWidgetType from '../../insalesApi/editWidgetType';
import uploadWidgetType from '../../insalesApi/uploadWidgetType';
import widgetFiles from '../../options/widgetFiles';
import { readWidgetData, collectWidgetChanges } from './widgetData';

export default async function changeWidget(
  options: NormalizedOptions,
  localAsset: Asset,
  remoteAsset: Asset | undefined,
  log: boolean,
): Promise<void> {
  const info = localAsset.insalesInfo;
  if (!widgetFiles.some((file) => file.fileName === info.name)) return;

  if (!remoteAsset?.id) {
    const data = readWidgetData(path.dirname(localAsset.path));
    await uploadWidgetType(data, localAsset.path, options, log);
    return;
  }

  if (info.name !== 'info.json') {
    await editWidgetType(info, remoteAsset.id, remoteAsset.path, options, log);
    return;
  }

  // Bulk upload uses info.json to send changed metadata and sources together.
  const localData = readWidgetData(path.dirname(localAsset.path));
  const changes = collectWidgetChanges(localData, remoteAsset);
  if (Object.keys(changes).length === 0) return;

  await createClient(options.insalesApi).editWidgetType({
    token: options.account.token,
    url: options.account.url,
    theme: options.theme.id,
    widgetId: remoteAsset.id,
    data: changes,
  });
}
