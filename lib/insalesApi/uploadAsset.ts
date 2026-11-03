import createClient from './client';
import logger from '../logger';
import type { AssetInfo, NormalizedOptions } from '../types';
export default async function uploadAsset(
  info: AssetInfo,
  path: string,
  options: NormalizedOptions,
  log = true,
): Promise<void> {
  if (info.type === 'Asset::Configuration' && /\.json$/i.test(info.name))
    JSON.parse(info.content ?? '');
  try {
    await createClient(options.insalesApi).uploadAsset({
      token: options.account.token,
      url: options.account.url,
      theme: options.theme.id,
      asset: info,
    });
    if (log) logger.green(`uploadAsset: ${path}`);
  } catch (error) {
    logger.error(`Error uploadAsset: ${path}`);
    throw error;
  }
}
