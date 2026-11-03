import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Resources } from '../resources';
import { UsageError } from '../errors';
import type { Settings } from '../configuration/types';
import type { Snapshot, SyncOptions, Plan } from './types';
import { ConflictError } from './errors';
import { equal } from './compare';
import { planSync } from './planner';
import { safe } from './paths';
import { SyncStore } from './store';
import { LocalTheme } from './local';
import { RemoteTheme } from './remote';
export class SyncService {
  readonly root: string;
  readonly stateDir: string;
  private readonly store: SyncStore;
  private readonly localTheme: LocalTheme;
  private readonly remoteTheme: RemoteTheme;
  constructor(
    settings: Settings,
    resources: Resources,
    private options: SyncOptions,
  ) {
    if (!settings.theme?.id || !settings.theme.root)
      throw new UsageError('Для sync нужны theme.id и theme.root');
    if (options.conflict && !['abort', 'source'].includes(options.conflict))
      throw new UsageError('--conflict: abort или source');
    this.root = path.resolve(settings.theme.root);
    this.store = new SyncStore(this.root, `${settings.account.url}/${settings.theme.id}`);
    this.stateDir = this.store.stateDir;
    this.localTheme = new LocalTheme(settings, options, () => this.base());
    this.remoteTheme = new RemoteTheme(resources, (name) => this.localTheme.selected(name));
  }
  base() {
    return this.store.base();
  }
  local() {
    return this.localTheme.snapshot();
  }
  remote() {
    return this.remoteTheme.snapshot();
  }
  history() {
    return this.store.history();
  }
  async prepare(
    direction: 'push' | 'pull',
  ): Promise<{ plan: Plan; local: Snapshot; remote: Snapshot }> {
    const local = await this.local();
    const remote = await this.remote();
    const base = Object.fromEntries(
      Object.entries(await this.base()).filter(([name]) => this.localTheme.selected(name)),
    );
    return { plan: planSync(local, remote, base, direction, this.options), local, remote };
  }
  async execute(prepared: { plan: Plan; local: Snapshot; remote: Snapshot }): Promise<Plan> {
    const { plan } = prepared;
    for (const action of plan.actions) {
      const parts = action.path.split('/');
      if (
        !['templates', 'snippets', 'config', 'media', 'widget_types'].includes(parts[0]) ||
        parts.length !== (parts[0] === 'widget_types' ? 3 : 2)
      )
        throw new UsageError('Некорректный путь в плане');
      parts.forEach(safe);
      if (action.source?.type === 'Asset::Configuration')
        JSON.parse(Buffer.from(action.source.content, 'base64').toString('utf8'));
      if (
        action.source?.type === 'widget' &&
        ['info', 'messages', 'settings_form', 'settings_data', 'setup'].includes(
          action.source.field ?? '',
        )
      ) {
        const text = Buffer.from(action.source.content, 'base64').toString('utf8');
        if (text) JSON.parse(text);
      }
      if (
        plan.direction === 'push' &&
        action.kind === 'delete' &&
        (parts[0] === 'config' ||
          (parts[0] === 'templates' && !parts[1].replace(/\.liquid$/, '').includes('.')))
      )
        throw new ConflictError(`Защищённый ассет: ${action.path}`);
    }
    if (plan.actions.some((action) => action.kind === 'conflict'))
      throw new ConflictError('Есть конфликты; используйте sync diff или --conflict source');
    if (this.options.dryRun) return plan;
    await fs.mkdir(this.stateDir, { recursive: true });
    const lock = path.join(this.stateDir, 'lock');
    const handle = await fs.open(lock, 'wx').catch(() => {
      throw new ConflictError('Назначение занято; проверьте .uploader lock');
    });
    const journal = {
      id: randomUUID(),
      direction: plan.direction,
      before: plan.direction === 'push' ? prepared.remote : prepared.local,
      source: plan.direction === 'push' ? prepared.local : prepared.remote,
      actions: plan.actions,
      completed: [] as string[],
      finished: false,
    };
    const journalPath = path.join(this.stateDir, `${journal.id}.journal.json`);
    try {
      await this.store.atomic(journalPath, JSON.stringify(journal));
      const current = plan.direction === 'push' ? await this.remote() : await this.local();
      for (const action of plan.actions)
        if (
          ['create', 'update', 'delete'].includes(action.kind) &&
          !equal(current[action.path], action.target)
        )
          throw new ConflictError(`План устарел: ${action.path}`);
      for (const action of plan.actions) {
        if (!['create', 'update', 'delete'].includes(action.kind)) continue;
        const latestEntry =
          plan.direction === 'push'
            ? await this.remoteTheme.entry(action.path)
            : (await this.local())[action.path];
        if (!equal(latestEntry, action.target) && !equal(latestEntry, action.source))
          throw new ConflictError(`План устарел: ${action.path}`);
        if (plan.direction === 'pull') {
          const target = path.join(this.root, action.path);
          if (action.source)
            await this.store.atomic(target, Buffer.from(action.source.content, 'base64'));
          else await fs.rm(target);
        } else await this.remoteTheme.write(action, prepared.local);
        await this.localTheme.mirror(action.path, action.source);
        if (plan.direction === 'push' && action.kind === 'create')
          this.remoteTheme.invalidate(action.path);
        const verifiedEntry =
          plan.direction === 'push'
            ? await this.remoteTheme.entry(action.path)
            : (await this.local())[action.path];
        if (!equal(verifiedEntry, action.source))
          throw new Error(`Не подтверждено сохранение: ${action.path}`);
        journal.completed.push(action.path);
        await this.store.atomic(journalPath, JSON.stringify(journal));
      }
      const local = await this.local();
      const remote = await this.remote();
      const base = await this.base();
      for (const name of new Set([...Object.keys(local), ...Object.keys(remote)]))
        if (equal(local[name], remote[name])) {
          if (local[name]) base[name] = local[name];
          else delete base[name];
        }
      for (const action of plan.actions) if (action.kind === 'delete') delete base[action.path];
      await this.store.atomic(path.join(this.stateDir, 'base.json'), JSON.stringify(base));
      journal.finished = true;
      await this.store.atomic(journalPath, JSON.stringify(journal));
      return plan;
    } finally {
      await handle.close();
      await fs.rm(lock, { force: true });
    }
  }
}
