import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { isRecord } from '../help/errors';
import type { Snapshot } from './types';
import { writeAtomic } from './storage';
export class SyncStore {
  readonly stateDir: string;
  constructor(
    private root: string,
    target: string,
  ) {
    this.stateDir = path.join(
      root,
      '.uploader',
      createHash('sha256').update(target).digest('hex').slice(0, 20),
    );
  }
  atomic(file: string, data: string | Buffer) {
    return writeAtomic(this.root, file, data);
  }
  async base(): Promise<Snapshot> {
    try {
      return JSON.parse(
        await fs.readFile(path.join(this.stateDir, 'base.json'), 'utf8'),
      ) as Snapshot;
    } catch (error) {
      if (isRecord(error) && error.code === 'ENOENT') return {};
      throw error;
    }
  }
  async history(): Promise<unknown[]> {
    try {
      const names = (await fs.readdir(this.stateDir)).filter((name) =>
        name.endsWith('.journal.json'),
      );
      return Promise.all(
        names.map(
          async (name) =>
            JSON.parse(await fs.readFile(path.join(this.stateDir, name), 'utf8')) as unknown,
        ),
      );
    } catch (error) {
      if (isRecord(error) && error.code === 'ENOENT') return [];
      throw error;
    }
  }
}
