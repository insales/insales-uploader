import chokidar from 'chokidar';
import type { SyncService } from './service';
import type { Plan } from './types';
export interface WatchEvents {
  conflicts(paths: string[]): void;
  synced(plan: Plan): void;
  error(message: string): void;
}
export async function watchTheme(
  service: SyncService,
  assetsSync: boolean,
  signal: AbortSignal,
  events: WatchEvents,
): Promise<void> {
  let pending = Promise.resolve();
  const watcher = chokidar.watch(
    ['templates', 'snippets', 'config', 'media', 'widget_types', ...(assetsSync ? ['assets'] : [])],
    {
      cwd: service.root,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
    },
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  const update = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      pending = pending.then(async () => {
        try {
          const prepared = await service.prepare('push');
          const conflicts = prepared.plan.actions.filter((action) => action.kind === 'conflict');
          if (conflicts.length) events.conflicts(conflicts.map((action) => action.path));
          prepared.plan.actions = prepared.plan.actions.filter(
            (action) => action.kind !== 'conflict',
          );
          events.synced(await service.execute(prepared));
        } catch (error) {
          events.error(error instanceof Error ? error.message : 'Ошибка');
        }
      });
    }, 200);
  };
  watcher.on('all', update);
  try {
    await new Promise<void>((resolve, reject) => {
      signal.addEventListener('abort', () => resolve(), { once: true });
      watcher.on('error', reject);
    });
  } finally {
    clearTimeout(timer);
    await watcher.close();
    await pending;
  }
  if (signal.aborted) throw Object.assign(new Error('Отменено'), { exitCode: 130 });
}
