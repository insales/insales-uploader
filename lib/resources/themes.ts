import type { ResourceDefinition } from './definition';
export const themeResource: ResourceDefinition = {
  collection: () => '/admin/themes',
  commands: ['list', 'get', 'update', 'publish', 'delete'],
};
