const {test} = require('node:test');
const assert = require('node:assert/strict');
const {planSync} = require('../dist/sync/planner');
const entry = value => ({type: 'Asset::Media', content: Buffer.from(value).toString('base64')});
test('three-way planner preserves destination changes and protects first-sync deletions', () => {
  const a = entry('a'), b = entry('b'), c = entry('c');
  const plan = (local, remote, base, options = {}) => planSync(local, remote, base, 'push', options).actions[0].kind;
  assert.equal(plan({x:a}, {x:a}, {}), 'unchanged');
  assert.equal(plan({x:b}, {x:a}, {x:a}), 'update');
  assert.equal(plan({x:a}, {x:b}, {x:a}), 'diverged');
  assert.equal(plan({x:b}, {x:c}, {x:a}), 'conflict');
  assert.equal(plan({x:b}, {x:c}, {}), 'conflict');
  assert.equal(plan({}, {x:a}, {}), 'diverged');
  assert.equal(plan({}, {x:a}, {}, {delete:true}), 'conflict');
  assert.equal(plan({}, {x:a}, {}, {delete:true, conflict:'source'}), 'delete');
  assert.equal(plan({}, {x:a}, {x:a}, {delete:true}), 'delete');
  assert.equal(plan({x:a}, {}, {}), 'create');
});
