import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isRecord } from '../help/errors';
import { UsageError } from '../errors';
import type { Settings } from './types';
export interface ConfigOptions {
  cwd?: string;
  config?: string;
  profile?: string;
  theme?: string;
}
export async function loadConfig(flags: ConfigOptions): Promise<Settings> {
  const cwd = path.resolve(flags.cwd ?? process.cwd());
  let file = flags.config && path.resolve(cwd, flags.config);
  if (!file) {
    let directory = cwd;
    for (;;) {
      const candidates: string[] = [];
      for (const ext of ['json', 'js', 'cjs', 'mjs']) {
        const candidate = path.join(directory, `insales-config.${ext}`);
        try {
          await fs.access(candidate);
          candidates.push(candidate);
        } catch {
          /* absent */
        }
      }
      if (candidates.length > 1) throw new UsageError('Несколько insales-config: укажите --config');
      if (candidates.length) {
        file = candidates[0];
        break;
      }
      const parent = path.dirname(directory);
      if (parent === directory) throw new UsageError('Нет insales-config: выполните uploader init');
      directory = parent;
    }
  }
  const value: unknown = file.endsWith('.json')
    ? JSON.parse(await fs.readFile(file, 'utf8'))
    : ((await import(pathToFileURL(file).href)) as { default: unknown }).default;
  if (!isRecord(value)) throw new UsageError('Конфигурация должна быть объектом');
  const name = flags.profile ?? value.defaultProfile;
  let selected: Record<string, unknown> = {};
  if (name !== undefined) {
    if (typeof name !== 'string' || !isRecord(value.profiles) || !isRecord(value.profiles[name]))
      throw new UsageError('Неизвестный профиль');
    selected = value.profiles[name];
  }
  const account = {
    ...(isRecord(value.account) ? value.account : {}),
    ...(isRecord(selected.account) ? selected.account : {}),
  };
  const theme = {
    ...(isRecord(value.theme) ? value.theme : {}),
    ...(isRecord(selected.theme) ? selected.theme : {}),
  };
  if (typeof account.tokenEnv === 'string') account.token = process.env[account.tokenEnv];
  if (
    (typeof account.id !== 'string' && typeof account.id !== 'number') ||
    typeof account.token !== 'string' ||
    !account.token ||
    typeof account.url !== 'string'
  )
    throw new UsageError('Нужны account.id, token/tokenEnv и url');
  if (theme.id !== undefined && typeof theme.id !== 'string' && typeof theme.id !== 'number')
    throw new UsageError('Invalid theme.id');
  const url = new URL(/^https?:/.test(account.url) ? account.url : `https://${account.url}`);
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw new UsageError('Некорректный адрес магазина');
  return {
    account: {
      id: String(account.id),
      token: account.token,
      url: url.host,
      http: account.http === true,
    },
    theme: {
      id: flags.theme ?? (theme.id === undefined ? undefined : String(theme.id)),
      root: path.resolve(path.dirname(file), typeof theme.root === 'string' ? theme.root : '.'),
      assetsSync: theme.assetsSync === true,
      excludeFiles: Array.isArray(theme.excludeFiles)
        ? theme.excludeFiles.filter((v): v is string => typeof v === 'string')
        : [],
    },
  };
}
