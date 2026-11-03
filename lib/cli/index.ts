import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import createUploader, { type InSalesUploader } from '../app';
import defaults from '../options/defaults';
import { isRecord, parseObject } from '../help/errors';
import type { UploaderOptions } from '../types';
interface CliOptions {
  cwd?: string;
  myappfile?: string;
  require?: string[];
  skipUnchanged?: boolean;
}
function assertConfig(value: unknown): asserts value is UploaderOptions {
  if (!isRecord(value) || !isRecord(value.account) || !isRecord(value.theme))
    throw new Error('Некорректный insales-config: нужны account и theme');
  const validId = (id: unknown) => typeof id === 'number' || typeof id === 'string';
  if (
    !validId(value.account.id) ||
    !validId(value.theme.id) ||
    typeof value.account.token !== 'string' ||
    typeof value.account.url !== 'string'
  )
    throw new Error('Некорректный insales-config: проверьте id, token и url');
}
function findConfig(cwd: string): string | undefined {
  let directory = cwd;
  for (;;) {
    for (const extension of ['js', 'json']) {
      const file = path.join(directory, `insales-config.${extension}`);
      if (fs.existsSync(file)) return file;
    }
    const parent = path.dirname(directory);
    if (parent === directory) return;
    directory = parent;
  }
}
const program = new Command();
const metadata = parseObject(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
if (typeof metadata.version !== 'string') throw new Error('Invalid package version');
program
  .name('uploader')
  .version(metadata.version, '-v, --version')
  .option('--cwd <path>', 'рабочая директория')
  .option('--myappfile <path>', 'путь к файлу настроек')
  .option('--skip-unchanged', 'не перезаписывать файлы с тем же содержимым')
  .option('--no-skip-unchanged', 'перезаписывать файлы с тем же содержимым')
  .option(
    '--require <module>',
    'подключить модуль',
    (value: string, previous: string[]) => [...previous, value],
    [],
  );
let uploader: InSalesUploader | undefined;
function instance(): InSalesUploader {
  if (uploader) return uploader;
  const flags = program.opts<CliOptions>();
  const cwd = path.resolve(flags.cwd || process.cwd());
  const load = createRequire(path.join(cwd, '__uploader_config__.cjs'));
  process.chdir(cwd);
  for (const module of flags.require ?? []) load(module);
  const configPath = flags.myappfile ? path.resolve(cwd, flags.myappfile) : findConfig(cwd);
  if (!configPath)
    throw new Error('Нет настроек: создайте insales-config.js командой uploader init');
  const required: unknown = load(configPath);
  const config = isRecord(required) && required.default ? required.default : required;
  assertConfig(config);
  const options =
    flags.skipUnchanged === undefined
      ? config
      : { ...config, theme: { ...config.theme, skipUnchanged: flags.skipUnchanged } };
  uploader = createUploader(options);
  return uploader;
}
const commands = [
  ['download', 'd', 'загрузка темы на компьютер'],
  ['start', 'a', 'скачивание темы и запуск stream'],
  ['pull', 'p', 'замена локальных файлов темой с сервера'],
  ['upload', 'u', 'загрузка темы на сервер'],
  ['stream', 's', 'отслеживание изменений'],
  ['backup', 'b', 'резервная копия темы'],
  ['listThemes', 'lt', 'список тем'],
  ['downloadFiles', 'df', 'скачать файлы аккаунта'],
  ['uploadFiles', 'uf', 'загрузить файлы аккаунта'],
] as const;
for (const [name, alias, description] of commands)
  program
    .command(name)
    .alias(alias)
    .description(description)
    .action(async () => {
      await instance()[name]();
    });
program
  .command('init')
  .alias('i')
  .description('создать файл настроек')
  .action(() => {
    const cwd = path.resolve(program.opts<CliOptions>().cwd || process.cwd());
    const config = {
      account: { id: '', token: '', url: '', ...defaults.account },
      theme: { id: '', ...defaults.theme },
      util: defaults.util,
    };
    fs.writeFileSync(
      path.join(cwd, 'insales-config.js'),
      'module.exports = ' + JSON.stringify(config, null, 2) + ';\n',
      { flag: 'wx' },
    );
    console.log('Создан файл настроек insales-config.js');
  });
program.action(async () => {
  await instance().start();
});
void program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
