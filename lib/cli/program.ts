import { resourceDefinitions, type Resource } from '../resources/catalog';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import { isRecord } from '../help/errors';
import { registerConfig } from './commands/config';
import { registerApi } from './commands/api';
import { registerResource } from './commands/resources';
import { registerSync } from './commands/sync';
export function createProgram(): Command {
  const metadata: unknown = JSON.parse(
    readFileSync(path.join(__dirname, '../../package.json'), 'utf8'),
  );
  if (!isRecord(metadata) || typeof metadata.version !== 'string')
    throw new Error('Invalid package version');
  const program = new Command()
    .name('uploader')
    .version(metadata.version)
    .exitOverride()
    .option('--cwd <path>')
    .option('--config <path>')
    .option('--profile <name>')
    .option('--theme <id>')
    .option('--json')
    .option('--yes')
    .option('--no-input');
  registerConfig(program);
  for (const resource of Object.keys(resourceDefinitions) as Resource[])
    registerResource(program, resource);
  registerApi(program);
  program.configureOutput({ writeErr: () => {} });
  registerSync(program);
  program.action(() => {
    program.outputHelp();
  });
  return program;
}
