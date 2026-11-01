import fs from 'node:fs/promises';
import path from 'node:path';
export default async function write(asset) {
  const destinations = Array.isArray(asset.path) ? asset.path : [asset.path];
  for (const destination of destinations) {
    await fs.mkdir(path.dirname(destination), {recursive: true});
    await fs.writeFile(destination, asset.content);
  }
}
