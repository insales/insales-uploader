import path from 'node:path';
import removeDir from '../file-system/removeDir';
import updateAssets from '../insalesApi/updateAssets';
export default async function pull(paths) {
  // Validate credentials and theme before touching the local copy.
  await updateAssets(this.options);
  if (this.options.theme.backup) await this.backup();
  const root = path.resolve(this.options.theme.root);
  const directories = Object.values(paths.folders);
  for (const directory of directories) {
    const relative = path.relative(root, path.resolve(directory));
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Unsafe theme directory: ${directory}`);
  }
  for (const directory of directories) removeDir(directory);
  await this.download();
  return this;
}
