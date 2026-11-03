import fs from 'node:fs/promises';
import type { ProjectPaths } from '../types';
export default async function createDir(paths: ProjectPaths): Promise<void> {
  for (const folder of Object.values(paths.folders)) await fs.mkdir(folder, { recursive: true });
}
