import semver from 'semver';
import fs from 'node:fs';
import path from 'node:path';
import logger from '../logger';
import { isRecord, parseObject } from '../help/errors';
export default async function checkNewVersion(): Promise<void> {
  try {
    const response = await fetch('https://registry.npmjs.org/insales-uploader/latest', {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return;
    const data: unknown = await response.json();
    const metadata = parseObject(
      fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'),
    );
    if (
      isRecord(data) &&
      typeof data.version === 'string' &&
      typeof metadata.version === 'string' &&
      semver.valid(data.version) &&
      semver.gt(data.version, metadata.version)
    )
      logger.blue(`Доступна новая версия insales-uploader => ${data.version}`);
  } catch {
    /* An optional update check must not block synchronization. */
  }
}
