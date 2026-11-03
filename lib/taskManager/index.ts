import delay from '../help/delay';
import ProgressBar from 'progress';

export interface QueueOptions {
  delay?: number;
}

export interface ProgressOptions {
  template: string;
}

type TaskSchema<T> = { [Name in keyof T]: object };
type TaskHandler<Item> = (item: Item) => unknown;

interface Registration<Item> {
  handler: TaskHandler<Item>;
  deduplicateBy: keyof Item | false;
}

function keepLastBy<Item>(items: readonly Item[], key: keyof Item | false): Item[] {
  if (key === false) return [...items];

  return items.filter((item, index) => {
    const value = item[key];
    if (value === undefined) return true;

    const hasLaterDuplicate = items.slice(index + 1).some((next) => next[key] === value);
    return !hasLaterDuplicate;
  });
}

function requestDelay(items: readonly object[], defaultDelay: number): number {
  // Thresholds count ordinary assets; widget-only batches keep the configured delay.
  const count = items.filter((item) => !('type' in item) || item.type !== 'Asset::Widget').length;
  if (count >= 600) return 2000;
  if (count >= 400) return 1300;
  if (count >= 300) return 500;
  if (count > 200) return 300;
  return defaultDelay;
}

export class TaskManager<
  Tasks extends TaskSchema<Tasks> = Record<string, Record<string, unknown>>,
> {
  readonly options: Required<QueueOptions>;
  private registrations: { [Name in keyof Tasks]?: Registration<Tasks[Name]> } = Object.create(
    null,
  ) as { [Name in keyof Tasks]?: Registration<Tasks[Name]> };
  private tail: Promise<void> = Promise.resolve();
  lock = false;

  constructor(options: QueueOptions = {}) {
    this.options = { delay: 100, ...options };
  }

  create<Name extends keyof Tasks & string>(
    name: Name,
    handler: TaskHandler<Tasks[Name]>,
    deduplicateBy: keyof Tasks[Name] | false = false,
  ): TaskHandler<Tasks[Name]> {
    this.registrations[name] = { handler, deduplicateBy };
    return handler;
  }

  createTask<Name extends keyof Tasks & string>(
    name: Name,
    handler: TaskHandler<Tasks[Name]>,
    deduplicateBy: keyof Tasks[Name] | false = false,
  ): TaskHandler<Tasks[Name]> {
    return this.create(name, handler, deduplicateBy);
  }

  run<Name extends keyof Tasks & string>(
    name: Name,
    items: readonly Tasks[Name][],
    progress: ProgressOptions | null = null,
  ): Promise<void> {
    const registration = this.registrations[name];
    if (!registration) return Promise.reject(new Error(`Unknown task: ${name}`));

    // Capture the registration and batch now: later create/run calls cannot change them.
    const batch = keepLastBy(items, registration.deduplicateBy);
    const result = this.tail.then(() => this.execute(batch, registration.handler, progress));

    // The caller receives the original rejection. Only the internal tail recovers,
    // so a failed batch stops immediately while the next batch can still execute.
    this.tail = result.catch(() => {});
    return result;
  }

  private async execute<Item extends object>(
    batch: readonly Item[],
    handler: TaskHandler<Item>,
    progressOptions: ProgressOptions | null,
  ): Promise<void> {
    this.lock = true;
    try {
      const progress =
        progressOptions && batch.length
          ? new ProgressBar(progressOptions.template, {
              total: batch.length,
              width: 20,
              clear: true,
            })
          : undefined;
      const throttle = requestDelay(batch, this.options.delay);

      for (const item of batch) {
        await delay(throttle);
        await handler(item);
        progress?.tick(item);
      }
    } finally {
      this.lock = false;
    }
  }

  async idle(): Promise<void> {
    await this.tail;
  }
}

interface TaskManagerFactory {
  <Tasks extends TaskSchema<Tasks> = Record<string, Record<string, unknown>>>(
    options?: QueueOptions,
  ): TaskManager<Tasks>;
  new <Tasks extends TaskSchema<Tasks> = Record<string, Record<string, unknown>>>(
    options?: QueueOptions,
  ): TaskManager<Tasks>;
}

const createTaskManager = function <Tasks extends TaskSchema<Tasks>>(options?: QueueOptions) {
  return new TaskManager<Tasks>(options);
} as TaskManagerFactory;

export default createTaskManager;
