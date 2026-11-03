import { UsageError } from '../../errors';
import { isRecord } from '../../help/errors';
import type { CommandFlags } from '../types';
export function print(data: unknown, flags: CommandFlags): void {
  if (Buffer.isBuffer(data)) {
    if (flags.json) throw new UsageError('Для бинарных данных используйте --output');
    process.stdout.write(data);
    return;
  }
  const rows: unknown = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data.actions)
      ? data.actions
      : undefined;
  if (
    !flags.json &&
    Array.isArray(rows) &&
    rows.length &&
    rows.every(isRecord) &&
    !rows.some((row) => 'before' in row || 'after' in row)
  ) {
    const keys = [
      ...new Set(
        rows.flatMap((row) =>
          Object.keys(row).filter(
            (key) => row[key] === null || ['string', 'number', 'boolean'].includes(typeof row[key]),
          ),
        ),
      ),
    ];
    if (keys.length) {
      process.stdout.write(
        keys.join('\t') +
          '\n' +
          rows
            .map((row) =>
              keys
                .map((key) => JSON.stringify(row[key] ?? '').replace(/[\r\n\t]/g, ' '))
                .join('\t'),
            )
            .join('\n') +
          '\n',
      );
      return;
    }
  }
  process.stdout.write(
    JSON.stringify(
      flags.json ? { ok: true, data, meta: {} } : data,
      null,
      flags.json ? undefined : 2,
    ) + '\n',
  );
}
