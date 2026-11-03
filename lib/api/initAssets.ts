import fs from 'node:fs';
import upath from 'upath';
import cpFile from '../file-system/copyFile';
import getExtention from '../help/getExtention';
import type { UploaderContext } from '../types';
export default async function initAssets(context: UploaderContext): Promise<void> {
  const paths = context.paths;
  for (const folder of Object.values(paths.folders)) fs.mkdirSync(folder, { recursive: true });
  for (const file of fs.readdirSync(paths.folders.media)) {
    const source = upath.join(paths.folders.media, file);
    const destination =
      (paths.mediaExtension[getExtention(file)] || paths.folders.assetsMedia) + file;
    if (!fs.statSync(source).isDirectory())
      cpFile.sync(source, destination, { skipUnchanged: context.options.theme.skipUnchanged });
  }
}
