import { isRecord } from '../help/errors';
import type { Entry } from './types';
export function equal(a?: Entry, b?: Entry): boolean {
  if (a?.field === 'info' && b?.field === 'info') {
    try {
      const left: unknown = JSON.parse(Buffer.from(a.content, 'base64').toString('utf8'));
      const right: unknown = JSON.parse(Buffer.from(b.content, 'base64').toString('utf8'));
      if (!isRecord(left) || !isRecord(right)) return false;
      const normalized = (value: unknown): unknown =>
        isRecord(value) && Object.keys(value).length === 1 && typeof value.ru === 'string'
          ? value.ru
          : value;
      return Object.keys(left)
        .filter((key) => key in right)
        .every(
          (key) => JSON.stringify(normalized(left[key])) === JSON.stringify(normalized(right[key])),
        );
    } catch {
      return false;
    }
  }
  return a?.content === b?.content && a?.type === b?.type;
}
