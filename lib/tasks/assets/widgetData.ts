import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { parseObject, isRecord } from '../../help/errors';
import widgetFiles from '../../options/widgetFiles';
import type { Asset } from '../../types';

export function readWidgetData(directory: string): Record<string, unknown> {
  const data = parseObject(fs.readFileSync(path.join(directory, 'info.json'), 'utf8'));

  for (const definition of widgetFiles) {
    if (definition.type === 'info') continue;
    const filePath = path.join(directory, definition.fileName);
    if (!fs.existsSync(filePath)) continue;

    const field = definition.uploadField || definition.apiField;
    const encoding = definition.type === 'url' ? 'base64' : 'utf8';
    data[field] = fs.readFileSync(filePath, encoding);
  }

  return data;
}

function comparableLocalValue(field: string, localValue: unknown, remoteValue: unknown): unknown {
  // Downloads wrap localized strings in {ru: text}; the API may return plain text.
  if (
    (field === 'name' || field === 'description') &&
    typeof remoteValue === 'string' &&
    isRecord(localValue) &&
    Object.keys(localValue).length === 1 &&
    typeof localValue.ru === 'string'
  ) {
    return localValue.ru;
  }
  return localValue;
}

export function collectWidgetChanges(
  localData: Record<string, unknown>,
  remoteAsset: Asset,
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};

  for (const [field, localValue] of Object.entries(localData)) {
    if (field === 'type' || field === 'handle') continue;

    const remoteValue = remoteAsset[field];
    const localComparable = comparableLocalValue(field, localValue, remoteValue);
    // Missing API sources are downloaded as empty files.
    const isSource = widgetFiles.some((file) => file.type === 'content' && file.apiField === field);
    const remoteComparable = isSource && remoteValue == null ? '' : remoteValue;

    // Some returned metadata (e.g. widget_category_handle) is rejected by PUT.
    // Omit unchanged fields and preserve the original local value for changed ones.
    if (!isDeepStrictEqual(localComparable, remoteComparable)) changes[field] = localValue;
  }

  return changes;
}
