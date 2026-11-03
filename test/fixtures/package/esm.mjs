import assert from 'node:assert/strict';
import uploader from 'insales-uploader';

const {default: open} = await import('open');
assert.equal(typeof open, 'function');

assert.equal(typeof uploader, 'function');
const options = {account: {id: '1', token: 'fixture', url: 'example.com'}, theme: {id: 42}};
assert.equal(typeof uploader(options).download, 'function');
assert.equal(typeof new uploader(options).stream, 'function');
