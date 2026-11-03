const {test} = require('node:test');
const assert = require('node:assert/strict');
const TaskManager = require('../dist/taskManager').default;
const queue = require('../dist/help/queue').default;
const {setTimeout: delay} = require('node:timers/promises');

test('concurrent runs serialize and promises resolve for their own batch', async () => {
  const manager = new TaskManager({delay: 0});
  const events = [];
  let active = 0;
  manager.create('work', async item => {
    assert.equal(++active, 1);
    events.push(item.id);
    await delay(5);
    active--;
  });
  await Promise.all([
    manager.run('work', [{id: 1}, {id: 2}]).then(() => events.push('first done')),
    manager.run('work', [{id: 3}]).then(() => events.push('second done'))
  ]);
  assert.deepEqual(events, [1, 2, 'first done', 3, 'second done']);
  assert.equal(manager.lock, false);
});
test('task failure rejects, stops its batch, unlocks and allows later runs', async () => {
  const manager = TaskManager({delay: 0});
  const failure = new Error('API failed');
  const executed = [];
  manager.create('work', async item => { executed.push(item.id); if (item.id === 1) throw failure; });
  const failed = manager.run('work', [{id: 1}, {id: 2}]);
  const recovered = manager.run('work', [{id: 3}]);
  await assert.rejects(failed, error => error === failure);
  await recovered;
  assert.deepEqual(executed, [1, 3]);
  assert.equal(manager.lock, false);
});
test('deduplication belongs to each task and does not mutate input objects', async () => {
  const manager = TaskManager({delay: 0});
  const output = [];
  manager.create('dedup', item => output.push(item.value), 'path');
  manager.create('all', item => output.push(item.value));
  const list = [{path: 'x', value: 1}, {path: 'x', value: 2}];
  await manager.run('dedup', list);
  await manager.run('all', list);
  assert.deepEqual(output, [2, 1, 2]);
  assert.equal(list[0].runner, undefined);
});
test('empty batch resolves and unknown tasks reject immediately', async () => {
  const manager = TaskManager({delay: 0});
  manager.create('work', () => assert.fail('must not run'));
  await manager.run('work', []);
  await assert.rejects(manager.run('missing', []), /Unknown task/);
});
test('helper queue preserves input, binds context and propagates rejection', async () => {
  const tasks = [function () { return this.value; }, () => 2];
  assert.deepEqual(await queue(tasks, {value: 1}), [1, 2]);
  assert.equal(tasks.length, 2);
  await assert.rejects(queue([() => { throw new Error('stop'); }]), /stop/);
});

test('batch promise settles for its own work, and pending batches remain serial', async () => {
  const manager = TaskManager({delay: 0});
  const firstStarted = Promise.withResolvers();
  const releaseFirst = Promise.withResolvers();
  const secondStarted = Promise.withResolvers();
  const releaseSecond = Promise.withResolvers();
  const events = [];
  manager.create('first', async () => {
    events.push('first started');
    firstStarted.resolve();
    await releaseFirst.promise;
    events.push('first finished');
  });
  manager.create('second', async () => {
    events.push('second started');
    secondStarted.resolve();
    await releaseSecond.promise;
    events.push('second finished');
  });
  const first = manager.run('first', [{}]);
  const second = manager.run('second', [{}]);
  await firstStarted.promise;
  assert.deepEqual(events, ['first started']);
  assert.equal(manager.lock, true);
  releaseFirst.resolve();
  await first;
  await secondStarted.promise;
  assert.deepEqual(events, ['first started', 'first finished', 'second started']);
  releaseSecond.resolve();
  await second;
  assert.equal(manager.lock, false);
});

test('registration and input array are captured before waiting in the queue', async () => {
  const manager = TaskManager({delay: 0});
  const release = Promise.withResolvers();
  const started = Promise.withResolvers();
  manager.create('block', async () => { started.resolve(); await release.promise; });
  const blocking = manager.run('block', [{}]);
  await started.promise;
  const values = [];
  manager.create('work', item => values.push(item.value), 'path');
  const items = [{path: 'x', value: 1}, {path: 'x', value: 2}, {value: 3}, {value: 4}];
  const pending = manager.run('work', items);
  items.push({value: 5});
  manager.create('work', () => assert.fail('new handler must not replace queued work'));
  release.resolve();
  await blocking;
  await pending;
  assert.deepEqual(values, [2, 3, 4]);
});

test('rejected async handler skips only its own remaining items and retains the error', async () => {
  const manager = TaskManager({delay: 0});
  const failure = new Error('asynchronous failure');
  const values = [];
  manager.create('work', async item => {
    values.push(item.value);
    await Promise.resolve();
    if (item.value === 1) throw failure;
  });
  const failed = manager.run('work', [{value: 1}, {value: 2}]);
  const next = manager.run('work', [{value: 3}]);
  await assert.rejects(failed, error => error === failure);
  await next;
  await manager.idle();
  assert.deepEqual(values, [1, 3]);
  assert.equal(manager.lock, false);
  await assert.rejects(manager.run('constructor', []), /Unknown task/);
});
