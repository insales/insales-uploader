import fs from 'node:fs/promises';
import path from 'node:path';
export default async function write(asset) {
  const destinations = Array.isArray(asset.path) ? asset.path : [asset.path];
  const content = asset.skipUnchanged && !Buffer.isBuffer(asset.content) ? Buffer.from(asset.content) : asset.content;
  for (const destination of destinations) {
    if (asset.skipUnchanged) {
      try {
        if ((await fs.readFile(destination)).equals(content)) continue;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    await fs.mkdir(path.dirname(destination), {recursive: true});
    await fs.writeFile(destination, content);
  }
}
