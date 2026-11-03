import type { ResourceDefinition } from './definition';
import { UsageError } from '../errors';
import { isRecord } from '../help/errors';
export const assetResource: ResourceDefinition = {
  collection: (theme) => {
    if (!theme) throw new UsageError('Укажите --theme');
    return `/admin/themes/${encodeURIComponent(theme)}/assets`;
  },
  commands: ['list', 'get', 'create', 'update', 'rename', 'delete'],
  validate(operation, body) {
    if (!isRecord(body.asset)) throw new UsageError('Нужен объект asset');
    if (operation === 'create' && (!body.asset.type || !body.asset.name))
      throw new UsageError('Нужны asset.type и asset.name');
    if (
      (body.asset.type === 'Asset::Configuration' ||
        (typeof body.asset.name === 'string' && body.asset.name.endsWith('.json'))) &&
      typeof body.asset.content === 'string'
    )
      JSON.parse(body.asset.content);
  },
};
