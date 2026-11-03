import { themeResource } from './themes';
import { assetResource } from './assets';
import { widgetTypeResource } from './widget-types';
import { fileResource } from './files';
export const resourceDefinitions = {
  theme: themeResource,
  asset: assetResource,
  'widget-type': widgetTypeResource,
  file: fileResource,
};
export type Resource = keyof typeof resourceDefinitions;
