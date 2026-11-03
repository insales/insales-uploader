import factory, { type UploaderFactory } from './app';
const uploader: UploaderFactory = factory;
declare namespace uploader {
  export type Options = import('./types').UploaderOptions;
  export type UpdateEvent = import('./types').UpdateEvent;
  export type UpdateCallback = import('./types').UpdateCallback;
  export type AssetType = import('./types').AssetType;
  export type Instance = import('./app').InSalesUploader;
}
export = uploader;
