import type { ChokidarOptions } from 'chokidar';
import type { TaskManager } from './taskManager';
import type { FileService } from './tasks/file';

export type Id = string | number;
export type AssetType =
  | 'Asset::Template'
  | 'Asset::Snippet'
  | 'Asset::Configuration'
  | 'Asset::Media'
  | 'Asset::Widget';
export interface AssetInfo {
  name: string;
  type: AssetType;
  content?: string;
  attachment?: string;
  base64?: string;
  apiField?: string;
}
export interface RemoteAsset extends Record<string, unknown> {
  id?: Id;
  type: string;
  name?: string | Record<string, unknown>;
  handle?: string;
  inner_file_name?: string;
  human_readable_name?: string;
  'human-readable-name'?: string;
  asset_url?: string | null;
  content?: string | null;
}
export interface Asset extends RemoteAsset {
  type: AssetType;
  path: string;
  pathKey: string;
  insalesInfo: AssetInfo;
  pathMedia: string | false;
  folder?: string;
  backup?: string;
  backupPath?: string;
  isMedia?: boolean;
  isRaw?: boolean;
  widget_type?: string;
  uploadType?: 'upload' | 'edit' | 'remove';
}
export interface FileInput {
  path: string;
  contents?: Buffer;
}
export interface FileInfo extends FileInput {
  asset: Asset;
  insalesInfo: AssetInfo;
  isAsset: boolean;
  isDirectory: boolean;
}
export interface UpdateEvent {
  event: 'add' | 'change' | 'unlink';
  path: string;
  asset: Asset;
  insalesInfo: AssetInfo;
}
export type UpdateCallback = (update: UpdateEvent) => void | Promise<void>;
export interface AccountOptions {
  id: Id;
  token: string;
  url: string;
  http?: boolean;
}
export interface ThemeOptions {
  id: Id;
  root?: string;
  backup?: boolean;
  assetsSync?: boolean;
  skipUnchanged?: boolean;
  excludeFiles?: string | string[];
  onUpdate?: UpdateCallback;
  assetsDomain?: string;
  /** Retained for older configs; assetsSync controls synchronization. */
  assets?: boolean;
}
export interface UploaderOptions {
  account: AccountOptions;
  theme: ThemeOptions;
  util?: { openBrowser?: boolean };
  chokidarOptions?: ChokidarOptions;
}
export interface ClientConfig {
  id: Id;
  secret?: string;
  http?: boolean;
  timeout?: number;
}
export interface NormalizedOptions {
  account: Required<AccountOptions> & { protocol: string };
  theme: Required<Omit<ThemeOptions, 'assets'>> & { excludeFiles: string[] };
  util: { openBrowser: boolean };
  chokidarOptions: ChokidarOptions;
  handle: string;
  themeUrl: string;
  insalesApi: ClientConfig;
}
export interface ProjectPaths {
  root: string;
  files: string;
  widget_types: string;
  folders: Record<string, string>;
  foldersDefaults: Record<string, string>;
  foldersAssets: Record<string, string>;
  mediaExtension: Record<string, string>;
  assets: Record<AssetType, { folder: string; backup: string; extension: string | string[] }>;
}
export interface WidgetFile {
  fileName: string;
  type: 'info' | 'content' | 'url';
  apiField: string;
  infoField?: string[];
  uploadField?: string;
}
export interface Theme extends Record<string, unknown> {
  id: Id;
  title?: string;
  type?: string;
  currentTheme?: string;
}
export interface ThemeList {
  list: Theme[];
  current?: Theme;
}
interface FileDestination {
  path: string | string[];
  skipUnchanged?: boolean;
}
export interface WriteTask extends FileDestination {
  content: string | Buffer;
}
export interface DownloadTask extends FileDestination {
  url: string;
}
export interface FileTasks {
  'file:write': WriteTask;
  'file:writeWithDownload': DownloadTask;
}
export interface AssetTasks {
  'asset:download': Asset;
  'asset:upload': Asset;
  'asset:change': Asset;
  'asset:remove': Asset;
  'asset:push:file': Asset;
}
export interface UploaderContext {
  options: NormalizedOptions;
  paths: ProjectPaths;
  assets: Record<string, Asset>;
  downloadList: Asset[];
  widgetFiles: WidgetFile[];
  TaskManager: TaskManager<AssetTasks>;
  files: FileService;
  getFileInfo(file: FileInput, withContent?: boolean): FileInfo;
  initAssets(): Promise<void>;
  backup(): Promise<string>;
  download(types?: AssetType[]): Promise<UploaderContext>;
}
