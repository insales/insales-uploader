import { watchTheme } from '../../sync/watch';
import { recoverSync } from '../../sync/recovery';
import type { Command } from 'commander';
import { context } from '../context';
import { print } from '../io/output';
import { confirm } from '../io/confirm';
import type { CommandFlags } from '../types';
import { SyncService } from '../../sync/service';
import type { SyncOptions } from '../../sync/types';
import { view } from '../io/plan';
interface Flags extends CommandFlags, SyncOptions {}
export function registerSync(program: Command): void {
  const group = program.command('sync');
  for (const name of ['status', 'diff', 'push', 'pull', 'watch', 'history', 'resume', 'restore']) {
    const command = group
      .command(`${name}${['resume', 'restore'].includes(name) ? ' <journal>' : ''}`)
      .option('--only <pattern>', 'включить', (v: string, old: string[]) => [...old, v], [])
      .option('--ignore <pattern>', 'исключить', (v: string, old: string[]) => [...old, v], [])
      .option('--delete')
      .option('--conflict <mode>', 'abort или source', 'abort')
      .option('--dry-run');
    command.action(async (...args: unknown[]) => {
      const flags = command.optsWithGlobals<Flags>();
      if (name === 'restore') flags.delete = true;
      const controller = new AbortController();
      const abort = () => controller.abort();
      process.once('SIGINT', abort);
      try {
        const { settings, resources } = await context(flags, controller.signal);
        const service = new SyncService(settings, resources, flags);
        if (name === 'history') {
          print(await service.history(), flags);
          return;
        }
        if (name === 'resume' || name === 'restore') {
          if (name === 'restore') await confirm(flags);
          print(await recoverSync(service, String(args[0]), name === 'restore', flags), flags);
          return;
        }
        if (name !== 'watch') {
          const prepared = await service.prepare(name === 'pull' ? 'pull' : 'push');
          print(
            view(
              ['status', 'diff'].includes(name) ? prepared.plan : await service.execute(prepared),
              name === 'diff',
            ),
            flags,
          );
          return;
        }
        await watchTheme(service, settings.theme?.assetsSync === true, controller.signal, {
          conflicts: (paths) => process.stderr.write(`Приостановлены: ${paths.join(', ')}\n`),
          synced: (plan) => {
            const data = view(plan);
            if (flags.json) process.stdout.write(JSON.stringify({ type: 'sync', data }) + '\n');
            else print(data, flags);
          },
          error: (message) => {
            if (flags.json) process.stdout.write(JSON.stringify({ type: 'error', message }) + '\n');
            else process.stderr.write(message + '\n');
          },
        });
      } finally {
        process.removeListener('SIGINT', abort);
      }
    });
  }
}
