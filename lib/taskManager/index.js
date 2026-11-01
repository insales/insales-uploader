import delay from '../help/delay';
import ProgressBar from 'progress';

class TaskManager {
  constructor(options = {}) {
    this.options = {delay: 100, ...options};
    this.tasks = Object.create(null);
    this.filters = Object.create(null);
    this.tail = Promise.resolve();
  }
  create(name, task, filterParam = false) {
    this.filters[name] = filterParam;
    return this.tasks[name] = task;
  }
  createTask(...args) { return this.create(...args); }
  run(name, list, statusBar = null) {
    const runner = this.tasks[name];
    if (typeof runner !== 'function') return Promise.reject(new Error(`Unknown task: ${name}`));
    const filter = this.filters[name];
    const batch = list.filter((item, index) => !filter || item[filter] === undefined ||
      !list.slice(index + 1).some(next => next[filter] === item[filter]));
    const execute = async () => {
      this.lock = true;
      try {
        const progress = statusBar && batch.length ? new ProgressBar(statusBar.template, {
          total: batch.length, width: 20, clear: true
        }) : null;
        const count = batch.filter(item => item.type !== 'Asset::Widget').length;
        const throttle = count >= 600 ? 2000 : count >= 400 ? 1300 : count >= 300 ? 500 : count > 200 ? 300 : this.options.delay;
        for (const item of batch) {
          await delay(throttle);
          await runner(item);
          if (progress) progress.tick(item);
        }
      } finally { this.lock = false; }
    };
    const result = this.tail.then(execute);
    this.tail = result.catch(() => {});
    return result;
  }
}
export default function createTaskManager(options) { return new TaskManager(options); }
