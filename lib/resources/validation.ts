import { isRecord } from '../help/errors';
import { UsageError } from '../errors';
import { resourceDefinitions, type Resource } from './catalog';
export function validateBody(resource: Resource, operation: string, body: unknown): void {
  if (body === undefined) return;
  if (!isRecord(body)) throw new UsageError('Тело должно быть объектом');
  resourceDefinitions[resource].validate?.(operation, body);
}
