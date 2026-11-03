import fs from 'node:fs/promises';
import path from 'node:path';
import { hasCode } from '../../help/errors';
import type { WriteTask } from '../../types';
export default async function write(asset: WriteTask): Promise<void> {
  if (asset.content === undefined) throw new Error('Missing file content');
  const destinations = Array.isArray(asset.path) ? asset.path : [asset.path];
  const content = Buffer.isBuffer(asset.content) ? asset.content : Buffer.from(asset.content);
  for (const destination of destinations) {
    if (asset.skipUnchanged) {
      try {
        if ((await fs.readFile(destination)).equals(content)) continue;
      } catch (error) {
        if (!hasCode(error, 'ENOENT')) throw error;
      }
    }
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, content);
  }
}
