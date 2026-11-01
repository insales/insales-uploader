const {Command} = require('commander');
const Liftoff = require('liftoff');
const v8flags = require('v8flags');
const fs = require('node:fs');
const path = require('node:path');
const argv = require('minimist')(process.argv.slice(2));
const createUploader = require('../app').default;

function invoke(env) {
  const program = new Command();
  const cwd = path.resolve(env.cwd || process.cwd());
  let uploader;
  function instance() {
    if (!env.configPath) throw new Error('Нет настроек: создайте insales-config.js командой uploader init');
    if (!uploader) {
      const required = require(env.configPath);
      uploader = createUploader(required.default || required);
    }
    return uploader;
  }
  program.name('uploader').version(require('../../package.json').version, '-v, --version')
    .option('--cwd <path>', 'рабочая директория')
    .option('--myappfile <path>', 'путь к файлу настроек')
    .option('--require <module>', 'подключить модуль')
    .option('--completion <value>', 'параметр Liftoff');
  const commands = [
    ['download', 'd', 'загрузка темы на компьютер'],
    ['start', 'a', 'скачивание темы и запуск stream'],
    ['pull', 'p', 'замена локальных файлов темой с сервера'],
    ['upload', 'u', 'загрузка темы на сервер'],
    ['stream', 's', 'отслеживание изменений'],
    ['backup', 'b', 'резервная копия темы'],
    ['listThemes', 'lt', 'список тем'],
    ['downloadFiles', 'df', 'скачать файлы аккаунта'],
    ['uploadFiles', 'uf', 'загрузить файлы аккаунта']
  ];
  for (const [name, alias, description] of commands) {
    program.command(name).alias(alias).description(description).action(async () => { await instance()[name](); });
  }
  program.command('init').alias('i').description('создать файл настроек').action(() => {
    const defaults = require('../options/defaults').default;
    const config = {account: {id: '', token: '', url: '', ...defaults.account}, theme: {id: '', ...defaults.theme}, util: defaults.util};
    fs.writeFileSync(path.join(cwd, 'insales-config.js'), 'module.exports = ' + JSON.stringify(config, null, 2) + ';\n', {flag: 'wx'});
    console.log('Создан файл настроек insales-config.js');
  });
  program.parseAsync(process.argv).catch(error => { console.error(error.message); process.exitCode = 1; });
}
const launcher = new Liftoff({name: 'uploader', moduleName: 'uploader', configName: 'insales-config', extensions: {'.js': null, '.json': null}, v8flags});
launcher.prepare({cwd: argv.cwd, configPath: argv.myappfile, require: argv.require, completion: argv.completion}, env => launcher.execute(env, invoke));
