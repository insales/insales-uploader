import type { Snapshot, SyncOptions, Plan, Action } from './types';
import { equal } from './compare';
export function planSync(
  local: Snapshot,
  remote: Snapshot,
  base: Snapshot,
  direction: 'push' | 'pull',
  options: SyncOptions,
): Plan {
  const source = direction === 'push' ? local : remote;
  const target = direction === 'push' ? remote : local;
  const actions: Action[] = [];
  for (const name of new Set([
    ...Object.keys(source),
    ...Object.keys(target),
    ...Object.keys(base),
  ])) {
    const a = source[name],
      b = target[name],
      old = base[name];
    let kind: Action['kind'];
    if (equal(a, b)) kind = 'unchanged';
    else if (!a && !options.delete) kind = 'diverged';
    else if (options.conflict === 'source') kind = !a ? 'delete' : !b ? 'create' : 'update';
    else if (!old) kind = !b && a ? 'create' : 'conflict';
    else if (equal(a, old)) kind = 'diverged';
    else if (!equal(b, old)) kind = 'conflict';
    else kind = !a ? 'delete' : !b ? 'create' : 'update';
    actions.push({ path: name, kind, source: a, target: b });
  }
  return { direction, actions };
}
