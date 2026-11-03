import type { SyncService } from './service';
import type { Snapshot, SyncOptions, Plan } from './types';
import { UsageError } from '../errors';
import { planSync } from './planner';
export async function recoverSync(
  service: SyncService,
  id: string,
  restore: boolean,
  options: SyncOptions,
): Promise<Plan> {
  const history = (await service.history()) as {
    id: string;
    direction: 'push' | 'pull';
    before: Snapshot;
    source: Snapshot;
  }[];
  const journal = history.find((item) => item.id === id);
  if (!journal) throw new UsageError('Журнал не найден');
  const current = await service.prepare(journal.direction);
  const desired = restore ? journal.before : journal.source;
  const local = journal.direction === 'push' ? desired : current.local;
  const remote = journal.direction === 'pull' ? desired : current.remote;
  return service.execute({
    local,
    remote,
    plan: planSync(
      local,
      remote,
      restore ? journal.source : journal.before,
      journal.direction,
      options,
    ),
  });
}
