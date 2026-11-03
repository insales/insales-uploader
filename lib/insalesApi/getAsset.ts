import createClient from './client';
import type { UploaderContext, Asset, RemoteAsset } from '../types';
export default async function getAsset(context: UploaderContext, asset: Asset) {
  if (asset.id === undefined) throw new Error(`Missing asset ID: ${asset.path}`);
  const options = context.options;
  const api = createClient(options.insalesApi);
  const connection = {
    token: options.account.token,
    url: options.account.url,
    theme: options.theme.id,
    assetId: asset.id,
  };
  const file = { path: asset.path, skipUnchanged: options.theme.skipUnchanged };
  if (asset.isRaw || asset.isMedia) {
    const { data } = await api.getAssetRaw({ ...connection, binary: asset.isMedia });
    await context.files.run('file:write', [{ ...file, content: data }]);
    return data;
  }
  let data: RemoteAsset = asset;
  if (!asset.isMedia || !asset.asset_url) data = (await api.getAsset(connection)).data;
  if (typeof data.content === 'string')
    await context.files.run('file:write', [{ ...file, content: data.content }]);
  else {
    if (!data.asset_url) throw new Error(`Missing download URL: ${asset.path}`);
    await context.files.run('file:writeWithDownload', [
      { ...file, url: new URL(data.asset_url, options.theme.assetsDomain).href },
    ]);
  }
  return data;
}
