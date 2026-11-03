import createClient from './client';
import logger from '../logger';
import type { NormalizedOptions } from '../types';
export default async function uploadWidgetType(
  data: Record<string, unknown>,
  path: string,
  options: NormalizedOptions,
  log = true,
): Promise<void> {
  try {
    await createClient(options.insalesApi).uploadWidgetType({
      token: options.account.token,
      url: options.account.url,
      theme: options.theme.id,
      data,
    });
    if (log) logger.green(`uploadWidgetType: ${path}`);
  } catch (error) {
    logger.error(`Error uploadWidgetType: ${path}`);
    throw error;
  }
}
