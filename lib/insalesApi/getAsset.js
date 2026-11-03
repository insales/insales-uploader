import InsalesApi from './client';
import DownloadManager from '../tasks/file';
export default async function getAsset(asset) {
  const options = this.options;
  const api = InsalesApi(options.insalesApi);
  const connection = {token: options.account.token, url: options.account.url, theme: options.theme.id, assetId: asset.id};
  const file = {path: asset.path, skipUnchanged: options.theme.skipUnchanged};
  // CDN URLs can serve compiled/stale content or return 403 for fresh assets.
  // Download media from the authenticated source endpoint, preserving bytes.
  if (asset.isRaw || asset.isMedia) {
    const {data} = await api.getAssetRaw({...connection, binary: asset.isMedia});
    await DownloadManager.run('file:write', [{...file, content: data}]);
    return data;
  }
  let data = asset;
  if (!asset.isMedia || !asset.asset_url) data = (await api.getAsset(connection)).data;
  if (typeof data.content === 'string') {
    await DownloadManager.run('file:write', [{...file, content: data.content}]);
  } else {
    const url = new URL(data.asset_url, options.theme.assetsDomain).href;
    await DownloadManager.run('file:writeWithDownload', [{...file, url}]);
  }
  return data;
}
