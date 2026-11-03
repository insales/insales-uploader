import path from 'node:path';

export default async function fileValidation(filePath: string): Promise<void> {
  const name = path.basename(filePath);
  if (/\s/.test(name)) throw new Error(`Удалите пробелы в названии файла! ${name}`);
}
