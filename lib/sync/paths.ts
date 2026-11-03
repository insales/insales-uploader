import { UsageError } from '../errors';
export function safe(name: string): string {
  if (
    !name ||
    /[\\/:]|^\.+$/.test(name) ||
    /[. ]$/.test(name) ||
    /^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(name)
  )
    throw new UsageError('Небезопасное имя ресурса');
  return name;
}
