const Liftoff = require('liftoff');
const v8flags = require('v8flags');
const argv = require('minimist')(process.argv.slice(2));
const InsalesUploader = require('../app').default;
const queue = require('../help/queue').default;

let Uploader = new Liftoff({
  name: 'uploader',
  moduleName: 'uploader',
  configName: 'insales-uploader',
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
  if (env.configPath) {
    config = require(env.configPath);
  }
  if (!config) {
    console.log('Нет настроек для insales-uploader')
    return;
  }

  let IU = new InsalesUploader(config);

  let methods = [];
  if (argv['_'].length == 0) {
    methods.push(IU.start)
  }else {
    for (let i = 0; i < argv['_'].length; i++) {
      let method = argv['_'][i];
      if (typeof IU[method] === 'function') {
        methods.push(IU[method]);
      }
    }
  }

  queue(methods, IU);
};

module.exports = Uploader.launch({
  cwd: argv.cwd,
  configPath: argv.myappfile,
  require: argv.require,
  completion: argv.completion
}, invoke);
