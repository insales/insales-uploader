import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { isRecord } from '../help/errors';
import { UsageError } from '../errors';
export async function writeAtomic(
  root: string,
  file: string,
  data: string | Buffer,
): Promise<void> {
  const relative = path.relative(root, file);
  if (relative.startsWith('..') || path.isAbsolute(relative))
    throw new UsageError('Путь вне проекта');
  let parent = root;
  for (const segment of relative.split(path.sep)) {
    parent = path.join(parent, segment);
    try {
      if ((await fs.lstat(parent)).isSymbolicLink())
        throw new UsageError('Символические ссылки не поддерживаются');
    } catch (error) {
      if (!(isRecord(error) && error.code === 'ENOENT')) throw error;
    }
  }
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, data);
    await fs.rename(temporary, file);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}
