export interface Entry {
  content: string;
  id?: string;
  type: string;
  field?: string;
}
export type Snapshot = Record<string, Entry>;
export interface SyncOptions {
  only?: string[];
  ignore?: string[];
  delete?: boolean;
  conflict?: string;
  dryRun?: boolean;
}
export interface Action {
  path: string;
  kind: 'create' | 'update' | 'delete' | 'unchanged' | 'diverged' | 'conflict';
  source?: Entry;
  target?: Entry;
}
export interface Plan {
  direction: 'push' | 'pull';
  actions: Action[];
}
