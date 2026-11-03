import chokidar, { type FSWatcher } from 'chokidar';
import { FileEvents } from './fileEvents';
import { WatchFilter } from './watchFilter';
import log from '../logger/log';
import type { UploaderContext, UpdateCallback, UpdateEvent } from '../types';

function waitUntilReady(watcher: FSWatcher): Promise<void> {
  // The watcher is event-based; this is the only Promise constructor needed here.
  return new Promise((resolve, reject) => {
    const ready = () => {
      watcher.removeListener('error', failed);
      resolve();
    };
    const failed = (error: unknown) => {
      watcher.removeListener('ready', ready);
      reject(error instanceof Error ? error : new Error('Watcher failed', { cause: error }));
    };
    watcher.once('ready', ready).once('error', failed);
  });
}

export class FileWatcher {
  instance: FSWatcher | null = null;
  private pending = Promise.resolve();
  private lifecycle = Promise.resolve();
  private active = false;
  private readonly events: FileEvents;

  constructor(
    private context: UploaderContext,
    private report: (error: unknown) => void = log,
  ) {
    this.events = new FileEvents(context);
  }

  process(
    event: UpdateEvent['event'],
    file: string,
    callback: UpdateCallback = () => {},
  ): Promise<void> {
    return this.events.process(event, file, callback);
  }

  private reportFailure(error: unknown): void {
    try {
      this.report(error);
    } catch (listenerError) {
      log(listenerError);
    }
  }

  private enqueue(event: UpdateEvent['event'], file: string, callback: UpdateCallback): void {
    this.pending = this.pending
      .then(() => this.events.process(event, file, callback))
      .catch((error) => this.reportFailure(error));
  }

  private subscribe(watcher: FSWatcher, filter: WatchFilter, callback: UpdateCallback): void {
    const receive = (event: UpdateEvent['event'], file: string) => {
      const absolute = filter.absolute(file);
      if (!this.active || watcher !== this.instance || !filter.eligible(absolute)) return;
      this.enqueue(event, absolute, callback);
    };
    watcher.on('add', (file) => receive('add', file));
    watcher.on('change', (file) => receive('change', file));
    watcher.on('unlink', (file) => receive('unlink', file));
  }

  start(callback: UpdateCallback = () => {}): Promise<void> {
    const drain = !this.events.insideCallback;
    const operation = this.lifecycle.then(() => this.open(callback, drain));
    this.lifecycle = operation.catch(() => {});
    return operation;
  }

  private async open(callback: UpdateCallback, drain: boolean): Promise<void> {
    await this.close(drain);
    const filter = new WatchFilter(this.context.paths, this.context.options);
    const watcher = chokidar.watch(Object.values(this.context.paths.folders), {
      ...this.context.options.chokidarOptions,
      ignored: (file, stats) => filter.ignored(file, stats),
    });
    this.instance = watcher;
    this.active = true;
    this.subscribe(watcher, filter, callback);

    try {
      await waitUntilReady(watcher);
      watcher.on('error', (error) => this.reportFailure(error));
    } catch (error) {
      await this.close(drain);
      throw error;
    }
  }

  private async close(drain: boolean): Promise<void> {
    this.active = false;
    const watcher = this.instance;
    this.instance = null;
    if (watcher) await watcher.close();

    // An onUpdate callback can await stopStream; do not wait for that same callback.
    if (drain) {
      await this.pending;
      this.events.clear();
    }
  }

  stop(): Promise<void> {
    // An external stop may already be waiting for this callback. Joining that
    // lifecycle chain from the callback would create a circular wait.
    if (this.events.insideCallback) return this.close(false);

    const operation = this.lifecycle.then(() => this.close(true));
    this.lifecycle = operation.catch(() => {});
    return operation;
  }
}

export function startWatching(
  context: { watcherService: FileWatcher },
  callback?: UpdateCallback,
): Promise<void> {
  return context.watcherService.start(callback);
}

export function stopWatching(context: { watcherService: FileWatcher }): Promise<void> {
  return context.watcherService.stop();
}
