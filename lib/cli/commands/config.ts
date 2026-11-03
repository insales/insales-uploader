import fs from 'node:fs/promises';
import path from 'node:path';
import type { Command } from 'commander';
import { loadConfig } from '../../configuration/load';
import type { Flags } from '../types';
import { print } from '../io/output';
export function registerConfig(program: Command): void {
  program.command('init').action(async () => {
    const flags = program.opts<Flags>();
    const destination = path.resolve(flags.cwd ?? '.', 'insales-config.json');
    await fs.writeFile(
      destination,
      JSON.stringify(
        {
          account: { id: '', tokenEnv: 'INSALES_TOKEN', url: '' },
          theme: { root: '.', assetsSync: false },
        },
        null,
        2,
      ) + '\n',
      { flag: 'wx' },
    );
    print({ path: destination }, flags);
  });
  program
    .command('config')
    .command('validate')
    .action(async () => {
      await loadConfig(program.opts<Flags>());
      print({ valid: true }, program.opts<Flags>());
    });
}
