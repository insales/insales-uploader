import InsalesApi from './client';
import DownloadManager from '../tasks/file';
export default async function getAsset(asset) {
  const options = this.options;
  const api = InsalesApi(options.insalesApi);
  const connection = {token: options.account.token, url: options.account.url, theme: options.theme.id, assetId: asset.id};
  if (asset.isRaw) {
    const {data} = await api.getAssetRaw(connection);
    await DownloadManager.run('file:write', [{path: asset.path, content: data}]);
    return data;
  }
  let data = asset;
  if (!asset.isMedia || !asset.asset_url) data = (await api.getAsset(connection)).data;
  if (typeof data.content === 'string') {
    await DownloadManager.run('file:write', [{path: asset.path, content: data.content}]);
  } else {
    const url = new URL(data.asset_url, options.theme.assetsDomain).href;
    await DownloadManager.run('file:writeWithDownload', [{path: asset.path, url}]);
  }
  return data;
}
