import createClient, { ApiError } from './client';
import logger from '../logger';
import type { Id, NormalizedOptions, Asset } from '../types';
export default async function removeAsset(
  assetId: Id,
  path: string,
  options: NormalizedOptions,
  assets: Record<string, Asset>,
  log = true,
): Promise<void> {
  const api = createClient(options.insalesApi);
  const connection = {
    token: options.account.token,
    url: options.account.url,
    theme: options.theme.id,
    assetId,
  };
  await api.removeAsset(connection);
  try {
    await api.getAsset(connection);
  } catch (error) {
    if (!(error instanceof ApiError) || error.statusCode !== 404) throw error;
    delete assets[path];
    if (path && log) logger.red(`Remove: ${path}`);
    return;
  }
  throw new Error(`API did not remove asset: ${path}`);
}
