import { createInterface } from 'node:readline/promises';
import { UsageError } from '../../errors';
import type { CommandFlags } from '../types';
export async function confirm(flags: CommandFlags): Promise<void> {
  if (flags.yes || flags.dryRun) return;
  if (flags.input === false || !process.stdin.isTTY)
    throw new UsageError('Нужно подтверждение --yes');
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    if ((await rl.question('Продолжить? [yes/no] ')).trim() !== 'yes')
      throw new UsageError('Отменено');
  } finally {
    rl.close();
  }
}
