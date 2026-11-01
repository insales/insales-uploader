import write from './write';
export default async function writeWithDownload(asset) {
  const response = await fetch(asset.url, {signal: AbortSignal.timeout(30000)});
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
  await write({path: asset.path, content: Buffer.from(await response.arrayBuffer())});
}
