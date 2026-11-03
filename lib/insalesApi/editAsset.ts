import createClient from './client';
import logger from '../logger';
import type { AssetInfo, Id, NormalizedOptions } from '../types';
export default async function editAsset(
  info: AssetInfo,
  assetId: Id,
  path: string,
  options: NormalizedOptions,
  log = true,
): Promise<void> {
  if (info.type === 'Asset::Configuration' && /\.json$/i.test(info.name))
    JSON.parse(info.content ?? '');
  try {
    await createClient(options.insalesApi).editAsset({
      token: options.account.token,
      url: options.account.url,
      theme: options.theme.id,
      assetId,
      asset: info,
    });
    if (log) logger.green(`editAsset: ${path}`);
  } catch (error) {
    logger.error(`Error editAsset: ${path}`);
    throw error;
  }
}
