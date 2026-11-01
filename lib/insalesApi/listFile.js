import InsalesApi from './client';
import upath from 'upath';
import {safeName} from '../help/safeName';
export default async function listFile(options, paths) {
  const api = InsalesApi(options.insalesApi);
  const files = [];
  const perPage = 100;
  for (let page = 1; ; page++) {
    const {data} = await api.listFile({token: options.account.token, url: options.account.url, query: {page, per_page: perPage}});
    if (!Array.isArray(data)) throw new Error('Invalid file list response');
    for (const item of data) {
      const url = new URL(item.absolute_url);
      const name = safeName(decodeURIComponent(url.pathname.split('/').pop()));
      files.push({name, path: upath.join(paths.files, name), url: item.absolute_url});
    }
    if (data.length < perPage) return files;
  }
}
