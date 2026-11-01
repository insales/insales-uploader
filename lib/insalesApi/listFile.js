import InsalesApi from './client';
import upath from 'upath';
import {safeName} from '../help/safeName';
import {createHash} from 'node:crypto';
export default async function listFile(options, paths) {
  const api = InsalesApi(options.insalesApi);
  const files = [];
  const perPage = 100;
  for (let page = 1; ; page++) {
    const {data} = await api.listFile({token: options.account.token, url: options.account.url, query: {page, per_page: perPage}});
    if (!Array.isArray(data)) throw new Error('Invalid file list response');
    for (const item of data) {
      const url = new URL(item.absolute_url);
      // InSales can store extensionless images whose URL ends in a dot.
      // Windows cannot represent that basename, so normalize it locally only.
      const name = safeName(decodeURIComponent(url.pathname.split('/').pop()).replace(/[ .]+$/, ''));
      const suffix = Number.isSafeInteger(item.id) && item.id > 0 ? String(item.id)
        : createHash('sha256').update(url.origin + url.pathname).digest('hex').slice(0, 12);
      files.push({name, url: item.absolute_url, suffix});
    }
    if (data.length < perPage) break;
  }
  const key = name => name.normalize('NFC').toLowerCase();
  const counts = new Map();
  for (const file of files) counts.set(key(file.name), (counts.get(key(file.name)) || 0) + 1);
  const used = new Set(files.map(file => key(file.name)));
  return files.map(file => {
    let name = file.name;
    if (counts.get(key(name)) > 1) {
      const {name: stem, ext} = upath.parse(name);
      let index = 1;
      do { name = `${stem}-${file.suffix}${index === 1 ? '' : `-${index}`}${ext}`; index++; }
      while (used.has(key(name)));
      used.add(key(name));
    }
    return {name, path: upath.join(paths.files, name), url: file.url};
  });
}
