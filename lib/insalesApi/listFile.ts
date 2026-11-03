import { createHash } from 'node:crypto';
import upath from 'upath';
import createClient from './client';
import { safeName } from '../help/safeName';
import { isRecord } from '../help/errors';
import type { NormalizedOptions, ProjectPaths } from '../types';

interface AccountFile {
  name: string;
  url: string;
  collisionSuffix: string;
}

interface LocalAccountFile {
  name: string;
  path: string;
  url: string;
}

const PAGE_SIZE = 100;

function filenameKey(name: string): string {
  return name.normalize('NFC').toLowerCase();
}

function collisionSuffix(id: unknown, url: URL): string {
  if (typeof id === 'number' && Number.isSafeInteger(id) && id > 0) return String(id);
  return createHash('sha256')
    .update(url.origin + url.pathname)
    .digest('hex')
    .slice(0, 12);
}

function parseFile(value: unknown): AccountFile {
  if (!isRecord(value) || typeof value.absolute_url !== 'string') {
    throw new Error('Invalid file response');
  }

  const url = new URL(value.absolute_url);
  const basename = decodeURIComponent(url.pathname.split('/').pop() ?? '');
  // InSales permits extensionless URLs ending in a dot. Normalize only the local
  // filename for Windows; preserve the complete original URL for the download.
  const name = safeName(basename.replace(/[ .]+$/, ''));

  return { name, url: value.absolute_url, collisionSuffix: collisionSuffix(value.id, url) };
}

async function fetchFiles(options: NormalizedOptions): Promise<AccountFile[]> {
  const api = createClient(options.insalesApi);
  const files: AccountFile[] = [];

  for (let page = 1; ; page++) {
    const { data } = await api.listFile({
      token: options.account.token,
      url: options.account.url,
      query: { page, per_page: PAGE_SIZE },
    });
    if (!Array.isArray(data)) throw new Error('Invalid file list response');

    files.push(...data.map(parseFile));
    if (data.length < PAGE_SIZE) return files;
  }
}

function uniqueFilename(file: AccountFile, reserved: Set<string>): string {
  const { name: stem, ext } = upath.parse(file.name);
  let attempt = 1;

  for (;;) {
    const counter = attempt === 1 ? '' : `-${attempt}`;
    const candidate = `${stem}-${file.collisionSuffix}${counter}${ext}`;
    if (!reserved.has(filenameKey(candidate))) return candidate;
    attempt++;
  }
}

function allocateFileNames(files: AccountFile[], directory: string): LocalAccountFile[] {
  const counts = new Map<string, number>();
  for (const file of files) {
    const key = filenameKey(file.name);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // Reserve original filenames too, so generated suffixes cannot overwrite them.
  const reserved = new Set(files.map((file) => filenameKey(file.name)));
  return files.map((file) => {
    const duplicated = (counts.get(filenameKey(file.name)) ?? 0) > 1;
    const name = duplicated ? uniqueFilename(file, reserved) : file.name;
    reserved.add(filenameKey(name));
    return { name, path: upath.join(directory, name), url: file.url };
  });
}

export default async function listFile(
  options: NormalizedOptions,
  paths: ProjectPaths,
): Promise<LocalAccountFile[]> {
  const files = await fetchFiles(options);
  return allocateFileNames(files, paths.files);
}
