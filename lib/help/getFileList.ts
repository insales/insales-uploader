import fs from 'node:fs';
import path from 'node:path';
import { hasCode } from './errors';
import type { UploaderContext, Asset } from '../types';
export default async function getFileList(
  directory: string,
  context: UploaderContext,
): Promise<Asset[]> {
  try {
    if (!fs.statSync(directory).isDirectory()) return [];
  } catch (error) {
    if (hasCode(error, 'ENOENT')) return [];
    throw error;
  }
  return fs
    .readdirSync(directory)
    .map((name) => context.getFileInfo({ path: path.join(directory, name) }, true))
    .filter((file) => !file.isDirectory)
    .map((file) => file.asset);
}
