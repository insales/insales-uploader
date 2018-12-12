const Liftoff = require('liftoff');
const v8flags = require('v8flags');
const program = require('commander');
const upath = require('upath');
const cpFile = require('cp-file');
const argv = require('minimist')(process.argv.slice(2));
const InsalesUploader = require('../app').default;
const getRootPath = require('../help/getRootPath').default;

/**
 * Создать консольный клиент
 */
let Uploader = new Liftoff({
  name: 'uploader',
  moduleName: 'uploader',
  configName: 'insales-config',
  extensions: {
    '.js': null,
    '.json': null
  },
  v8flags: v8flags
}).on('require', function (name, module) {
  console.log('Loading:',name);
}).on('requireFail', function (name, err) {
  console.log('Unable to load:', name, err);
}).on('respawn', function (flags, child) {
  console.log('Detected node flags:', flags);
  console.log('Respawned to PID:', child.pid);
});

let invoke = function (env) {
  let config =  {};
  let IU = {};
  if (env.configPath) {
    config = require(env.configPath);
    if (config && typeof config.account != 'undefined' && typeof config.account.id != 'undefined') {
      IU = new InsalesUploader(config);
    }else{
      console.log('Нет настроек для InsalesUploader!');
    }
  }

  initProgram(IU);
};

module.exports = Uploader.launch({
  cwd: argv.cwd,
  configPath: argv.myappfile,
  require: argv.require,
  completion: argv.completion
}, invoke);

const initProgram = (IU) => {

  program
    .version(require(getRootPath() + '/package.json').version, '-v, --version');

  program
    .command('download')
    .alias('d')
    .description('загрузка темы на компьютер')
    .action(() => {
      return IU.download();
    });

  program
    .command('start')
    .alias('a')
    .description('загрузка темы на компьютер + запуск метода stream')
    .action(() => {
      return IU.start();
    });

  program
    .command('pull')
    .alias('p')
    .description('загрузка темы на компьютер. Перед началом загрузки, все локальные файлы удаляются')
    .action(() => {
      return IU.pull();
    });

  program
    .command('upload')
    .alias('u')
    .description('загрузка темы на сервер с полным обновлением файлов')
    .action(() => {
      return IU.upload();
    });

  program
    .command('stream')
    .alias('s')
    .description('отслеживание изменений в файлах')
    .action(() => {
      return IU.stream();
    });

  program
    .command('backup')
    .alias('b')
    .description('создание архива с резервной копией')
    .action(() => {
      return IU.backup();
    });
  
  program
    .command('listThemes')
    .alias('lt')
    .description('получить список доступных тем')
    .action(() => {
      return IU.listThemes();
    });

  program
    .command('downloadFiles')
    .alias('df')
    .description('скачать файлы из раздела файлы в бэк-офисе')
    .action(() => {
      return IU.downloadFiles();
    });

  program
    .command('uploadFiles')
    .alias('uf')
    .description('загрузка файлов в раздел файлы (Загружаются файлы из директории files)')
    .action(() => {
      return IU.uploadFiles();
    });

  program
    .command('init')
    .alias('i')
    .description('Инициализировать проект')
    .action(function () {
      let root = getRootPath();
      let cwd = process.env.PWD || process.cwd()
      let newConfig = upath.normalize(cwd + '/insales-config.js');
      let defaultConfig = upath.normalize(root + '/dist/options/defaults.js');
      
      try {
        cpFile.sync(defaultConfig, newConfig);
        console.log('Создан файл настроек insales-config.js');
      } catch (e) {
        console.log('Ошибка при создании файла настроек insales-config.js');
        console.log(e);
      }
    });

  program.parse(process.argv);

  if (argv['_'].length == 0){
    console.log('Введите команду')
    console.log('Например: uploader --help')
  }
};