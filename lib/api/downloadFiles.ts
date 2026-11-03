import listFile from '../insalesApi/listFile';
import type { UploaderContext } from '../types';
export default async function downloadFiles(context: UploaderContext): Promise<void> {
  const files = await listFile(context.options, context.paths);
  await context.files.run(
    'file:writeWithDownload',
    files.map((file) => ({ ...file, skipUnchanged: context.options.theme.skipUnchanged })),
  );
}
