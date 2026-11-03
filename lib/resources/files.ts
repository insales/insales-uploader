import type { ResourceDefinition } from './definition';
export const fileResource: ResourceDefinition = {
  collection: () => '/admin/files',
  paginated: true,
  commands: ['list', 'get', 'upload', 'download', 'delete'],
};
