import createClient from './client';
import logger from '../logger';
import type { Id, NormalizedOptions, Asset } from '../types';
export default async function removeWidgetType(
  widgetId: Id,
  path: string,
  options: NormalizedOptions,
  assets: Record<string, Asset>,
  log = true,
): Promise<void> {
  await createClient(options.insalesApi).removeWidgetType({
    token: options.account.token,
    url: options.account.url,
    theme: options.theme.id,
    widgetId,
  });
  delete assets[path];
  if (path && log) logger.red(`Remove: ${path}`);
}
