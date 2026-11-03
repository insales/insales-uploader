#!/usr/bin/env node
const semver = require('semver');
const requiredVersion = require('../package.json').engines.node;

if (!semver.satisfies(process.versions.node, requiredVersion)) {
  console.error(`Для запуска insales-uploader нужен Node.js ${requiredVersion}.\n` +
    `Сейчас используется Node.js ${process.versions.node}.\n` +
    'Обновите Node.js и запустите uploader снова.');
  process.exitCode = 1;
} else {
  require('../dist/cli').run().then(code => { process.exitCode = code; });
}
