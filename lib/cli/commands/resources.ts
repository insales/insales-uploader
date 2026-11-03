import { resourceDefinitions } from '../../resources/catalog';
import { operateResource } from '../../operations/resource';
import path from 'node:path';
import type { Command } from 'commander';
import type { Resource } from '../../resources';
import { context } from '../context';
import { print } from '../io/output';
import { confirm } from '../io/confirm';
import { readInput } from '../io/input';
import type { CommandFlags } from '../types';
export function registerResource(program: Command, resource: Resource): void {
  const group = program.command(resource);
  const names = resourceDefinitions[resource].commands;
  for (const name of names) {
    const needsId = ['get', 'update', 'publish', 'rename', 'delete'].includes(name);
    const command = group.command(
      `${name}${needsId ? ' <id>' : name === 'upload' ? ' <files...>' : name === 'download' ? ' [id]' : ''}`,
    );
    command
      .option('--dry-run')
      .option('--input <file|->')
      .option('--output <path>')
      .option('--raw')
      .option('--all')
      .option('--title <title>')
      .option('--description <text>')
      .option('--new-name <name>');
    command.action(async (...args: unknown[]) => {
      const flags = command.optsWithGlobals<CommandFlags>();
      if (flags.output) flags.output = path.resolve(flags.cwd ?? process.cwd(), flags.output);
      const { resources } = await context(flags);
      if (name === 'publish' || name === 'delete') await confirm(flags);
      const input =
        ['create', 'update'].includes(name) && resource !== 'theme'
          ? await readInput(command.getOptionValue('input') as string | undefined, flags.cwd)
          : undefined;
      const data = await operateResource(resources, resource, name, args, flags, input);
      print(data, flags);
    });
  }
}
