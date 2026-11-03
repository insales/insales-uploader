import { CommanderError } from 'commander';
import { isRecord } from '../help/errors';
import { createProgram } from './program';
export async function run(argv = process.argv): Promise<number> {
  try {
    await createProgram().parseAsync(argv);
    return 0;
  } catch (error) {
    if (error instanceof CommanderError && error.exitCode === 0) return 0;
    const code =
      error instanceof CommanderError
        ? 2
        : isRecord(error) && typeof error.exitCode === 'number'
          ? error.exitCode
          : error instanceof CommanderError || error instanceof SyntaxError
            ? 2
            : 1;
    const message = error instanceof Error ? error.message : 'Ошибка выполнения';
    if (argv.includes('--json'))
      process.stdout.write(
        JSON.stringify({
          ok: false,
          error: { code, message, details: isRecord(error) ? (error.details ?? {}) : {} },
        }) + '\n',
      );
    else process.stderr.write(message + '\n');
    return code;
  }
}
