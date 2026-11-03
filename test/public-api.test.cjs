const {test} = require('node:test');
const assert = require('node:assert/strict');
const Uploader = require('..');
const {options} = require('./helpers.cjs');

test('CommonJS entry supports calls with and without new', () => {
  for (const app of [Uploader(options('.')), new Uploader(options('.'))]) {
    for (const method of ['download', 'upload', 'pull', 'backup', 'downloadFiles', 'uploadFiles',
      'downloadTemplates', 'downloadSnippets', 'downloadConfig', 'downloadMedia',
      'start', 'stream', 'stopStream', 'listThemes', 'pullTheme', 'pushTheme']) {
      assert.equal(typeof app[method], 'function', method);
    }
  }
});

test('factory instances own their state', () => {
  const first = Uploader(options('.'));
  const second = Uploader(options('.'));
  assert.notEqual(first.assets, second.assets);
  assert.notEqual(first.TaskManager, second.TaskManager);
  assert.notEqual(first.options, second.options);
});
