import fs from 'node:fs/promises';
import path from 'node:path';
import { UsageError } from '../../errors';
export async function readInput(file?: string, cwd = process.cwd()): Promise<unknown> {
  if (!file) throw new UsageError('Укажите --input <file|->');
  if (file !== '-')
    return JSON.parse(await fs.readFile(path.resolve(cwd, file), 'utf8')) as unknown;
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk as Uint8Array));
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}
