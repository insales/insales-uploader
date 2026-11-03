import createClient from './client';
import logger from '../logger';
import widgetFiles from '../options/widgetFiles';
import { parseObject } from '../help/errors';
import type { AssetInfo, Id, NormalizedOptions } from '../types';
export default async function editWidgetType(
  info: AssetInfo,
  widgetId: Id,
  path: string,
  options: NormalizedOptions,
  log = true,
): Promise<void> {
  const definition = widgetFiles.find((item) => item.fileName === info.name);
  if (!definition) return;
  const field = definition.uploadField || definition.apiField;
  const data =
    field === 'info'
      ? Object.fromEntries(
          Object.entries(parseObject(info.content ?? '')).filter(
            ([key]) => !['type', 'handle'].includes(key),
          ),
        )
      : { [field]: field === 'preview_base64' ? info.base64 : info.content };
  try {
    await createClient(options.insalesApi).editWidgetType({
      token: options.account.token,
      url: options.account.url,
      theme: options.theme.id,
      widgetId,
      data,
    });
    if (log) logger.green(`Edit: ${path}`);
  } catch (error) {
    logger.error(`Error edit: ${path}`);
    throw error;
  }
}
