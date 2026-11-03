import createClient, { remoteAsset } from './client';
import type { NormalizedOptions } from '../types';
export default async function updateAssets(options: NormalizedOptions) {
  const api = createClient(options.insalesApi);
  const connection = {
    token: options.account.token,
    url: options.account.url,
    theme: options.theme.id,
  };
  const assets = await api.listAsset(connection);
  const widgets = await api.listWidgetTypes(connection);
  if (!Array.isArray(assets.data) || !Array.isArray(widgets.data))
    throw new Error('Invalid asset list response');
  return [...(assets.data as unknown[]), ...(widgets.data as unknown[])].map(remoteAsset);
}
