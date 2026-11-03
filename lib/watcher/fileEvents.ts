import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import upath from 'upath';
import { syncChange, syncUnlink } from './synchronize';
import { hasCode } from '../help/errors';
import fileValidation from '../help/fileValidation';
import type { UploaderContext, UpdateCallback, UpdateEvent } from '../types';

type FileEvent = UpdateEvent['event'];

async function readContents(file: string): Promise<Buffer | undefined> {
  try {
    return await fs.readFile(file);
  } catch (error) {
    if (hasCode(error, 'ENOENT')) return undefined;
    throw error;
  }
}

function fingerprint(contents: Buffer | undefined): string {
  if (contents === undefined) return 'deleted';
  return createHash('sha256').update(contents).digest('hex');
}

/** Processes one filesystem event; FileWatcher serializes calls to this service. */
export class FileEvents {
  private mirrored = new Map<string, string>();
  private callbacks = new AsyncLocalStorage<boolean>();

  constructor(private context: UploaderContext) {}

  get insideCallback(): boolean {
    return this.callbacks.getStore() === true;
  }

  clear(): void {
    this.mirrored.clear();
  }

  private consumeMirroredEvent(file: string, signature: string): boolean {
    const expected = this.mirrored.get(file);
    this.mirrored.delete(file);
    return expected === signature;
  }

  async process(event: FileEvent, filePath: string, callback: UpdateCallback): Promise<void> {
    const file = upath.normalize(filePath);
    const contents = event === 'unlink' ? undefined : await readContents(file);
    // A later unlink event will handle a file removed before we could read it.
    if (event !== 'unlink' && contents === undefined) return;

    const signature = fingerprint(contents);
    if (this.consumeMirroredEvent(file, signature)) return;

    await fileValidation(file);
    const info = this.context.getFileInfo({ path: file, contents }, event !== 'unlink');
    const target =
      event === 'unlink' ? syncUnlink(this.context, file) : syncChange(this.context, info);
    if (target) this.mirrored.set(target, signature);

    const task = event === 'unlink' ? 'asset:remove' : 'asset:change';
    await this.context.TaskManager.run(task, [info.asset]);

    const update: UpdateEvent = {
      event,
      path: info.path,
      asset: info.asset,
      insalesInfo: info.insalesInfo,
    };
    await this.callbacks.run(true, async () => {
      await callback(update);
      await this.context.options.theme.onUpdate(update);
    });
  }
}
