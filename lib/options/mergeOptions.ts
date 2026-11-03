import path from 'node:path';
import upath from 'upath';
import defaults from './defaults';
import deepMerge from '../help/deepMerge';
import type { UploaderOptions, NormalizedOptions } from '../types';
export default function mergeOptions(input: UploaderOptions): NormalizedOptions {
  if (input && 'plugins' in input)
    throw new Error(
      'InSales Uploader v2: plugins/Gulp больше не поддерживаются. Собирайте файлы внешним инструментом и удалите plugins из конфигурации.',
    );
  for (const key of ['id', 'token', 'url'] as const) {
    if (!input?.account?.[key]) throw new Error(`Отсутствует ${key} аккаунта!`);
  }
  if (!input?.theme?.id) throw new Error('Отсутствует id темы!');
  const account = { ...defaults.account, ...input.account };
  const theme = { ...defaults.theme, ...input.theme };
  const http = account.http;
  const protocol = http ? 'http://' : 'https://';
  const url = new URL(/^https?:\/\//i.test(account.url) ? account.url : `https://${account.url}`);
  if (url.username || url.password)
    throw new Error('URL аккаунта не должен содержать логин или пароль');
  return {
    account: { ...account, url: url.host, protocol },
    theme: {
      ...theme,
      root: upath.normalize(path.resolve(theme.root)),
      excludeFiles:
        typeof theme.excludeFiles === 'string' ? [theme.excludeFiles] : [...theme.excludeFiles],
    },
    util: { ...defaults.util, ...input.util },
    chokidarOptions: deepMerge(deepMerge({}, defaults.chokidarOptions), input.chokidarOptions),
    handle: `${url.host.split('.')[0]}-${theme.id}`,
    themeUrl: `${protocol}${url.host}/?theme_preview=${theme.id}`,
    insalesApi: { id: account.id, secret: account.token, http },
  };
}
