import { isRecord } from './errors';
export function isObject(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  );
}
export function copyValue(value: unknown): unknown {
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);
  if (Array.isArray(value)) return value.map(copyValue);
  if (isObject(value)) return deepMerge({}, value);
  return value;
}
export default function deepMerge<T extends object>(target: T, source: unknown): T {
  if (!isObject(source)) return target;
  for (const [key, value] of Object.entries(source)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
    const previous: unknown = Reflect.get(target, key);
    const copied = isObject(value)
      ? deepMerge(isObject(previous) ? previous : {}, value)
      : copyValue(value);
    Object.defineProperty(target, key, {
      value: copied,
      configurable: true,
      enumerable: true,
      writable: true,
    });
  }
  return target;
}
