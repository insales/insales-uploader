import type { UploaderContext } from '../types';
import path from 'node:path';
import removeDir from '../file-system/removeDir';
import updateAssets from '../insalesApi/updateAssets';
export default async function pull(context: UploaderContext) {
  // Validate credentials and theme before touching the local copy.
  await updateAssets(context.options);
  if (context.options.theme.backup) await context.backup();
  const root = path.resolve(context.options.theme.root);
  const directories = Object.values(context.paths.folders);
  for (const directory of directories) {
    const relative = path.relative(root, path.resolve(directory));
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative))
      throw new Error(`Unsafe theme directory: ${directory}`);
  }
  for (const directory of directories) removeDir(directory);
  await context.download();
  return context;
}
