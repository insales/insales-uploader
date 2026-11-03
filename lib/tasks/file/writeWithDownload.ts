import write from './write';
import type { DownloadTask } from '../../types';
export default async function writeWithDownload(asset: DownloadTask): Promise<void> {
  if (!asset.url) throw new Error('Missing download URL');
  const response = await fetch(asset.url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${asset.url}`);
  await write({ ...asset, content: Buffer.from(await response.arrayBuffer()) });
}
