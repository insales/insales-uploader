import type { UploaderContext } from '../types';
import { hasCode } from '../help/errors';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import JSZip from 'jszip';

export default async function backup(context: UploaderContext) {
  const root = path.resolve(context.options.theme.root);
  const zip = new JSZip();
  async function add(directory: string) {
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (hasCode(error, 'ENOENT')) return;
      throw error;
    }
    for (const entry of entries) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await add(file);
      else if (entry.isFile())
        zip.file(path.relative(root, file).replace(/\\/g, '/'), await fs.readFile(file));
    }
  }
  for (const directory of new Set(Object.values(context.paths.folders))) await add(directory);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destination = path.join(
    root,
    'backup',
    `${context.options.handle}-backup-${timestamp}-${randomUUID()}.zip`,
  );
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(
    destination,
    await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }),
    { flag: 'wx' },
  );
  return destination;
}
