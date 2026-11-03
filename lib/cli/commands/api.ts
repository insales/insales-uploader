import type { Command } from 'commander';
import { UsageError } from '../../errors';
import type { Method } from '../../http/transport';
import { context } from '../context';
import { print } from '../io/output';
import { readInput } from '../io/input';
import type { CommandFlags } from '../types';
export function registerApi(program: Command): void {
  program
    .command('api <method> <path>')
    .option('--input <file|->')
    .option('--raw')
    .action(async (method: string, route: string, _flags: unknown, command: Command) => {
      const flags = command.optsWithGlobals<CommandFlags>();
      if (!['GET', 'PUT', 'POST', 'DELETE'].includes(method))
        throw new UsageError('Метод: GET, PUT, POST, DELETE');
      const { resources } = await context(flags);
      print(
        await resources.transport.request(
          method as Method,
          route,
          command.getOptionValue('input')
            ? await readInput(command.getOptionValue('input') as string, flags.cwd)
            : undefined,
          flags.raw,
        ),
        flags,
      );
    });
}
