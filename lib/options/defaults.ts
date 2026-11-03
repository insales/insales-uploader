import type { ChokidarOptions } from 'chokidar';
import type { UpdateCallback } from '../types';
const defaults = {
  account: { http: false },
  theme: {
    root: '.',
    backup: true,
    assetsSync: true,
    skipUnchanged: false,
    excludeFiles: [] as string[],
    onUpdate: (() => {}) as UpdateCallback,
    assetsDomain: 'https://assets.insales.ru',
  },
  util: { openBrowser: true },
  chokidarOptions: {
    ignored: /[\/\\]\./,
    ignoreInitial: true,
    followSymlinks: true,
    usePolling: false,
    interval: 200,
    binaryInterval: 300,
    alwaysStat: true,
    depth: 99,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 100 },
    ignorePermissionErrors: true,
  } satisfies ChokidarOptions,
};
export default defaults;
