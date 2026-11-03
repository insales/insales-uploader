import fs from 'node:fs';
import upath from 'upath';
import omitAssets from '../help/omitAssets';
import type { Asset } from '../types';
export default async function findDiffAssets(
  folders: Record<string, string>,
  assets: Record<string, Asset>,
) {
  const local: string[] = [];
  for (const folder of Object.values(folders)) {
    try {
      for (const name of fs.readdirSync(folder)) {
        const file = upath.join(folder, name);
        if (!fs.statSync(file).isDirectory()) local.push(file);
      }
    } catch (error) {
      throw new Error(`Не удалось прочитать директорию ${folder}`, { cause: error });
    }
  }
  return omitAssets(assets, local);
}
