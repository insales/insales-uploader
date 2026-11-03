import { loadConfig } from '../configuration/load';
import { Resources } from '../resources';
import { Transport } from '../http/transport';
import type { Flags } from './types';
export async function context(flags: Flags, signal?: AbortSignal) {
  const settings = await loadConfig(flags);
  return {
    settings,
    resources: new Resources(new Transport(settings, signal), settings.theme?.id),
  };
}
