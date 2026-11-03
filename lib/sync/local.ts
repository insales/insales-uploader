import fs from 'node:fs/promises';
import path from 'node:path';
import picomatch from 'picomatch';
import type { Settings } from '../configuration/types';
import { UsageError } from '../errors';
import { ConflictError } from './errors';
import { isRecord } from '../help/errors';
import widgetFiles from '../options/widgetFiles';
import type { Snapshot, SyncOptions, Entry } from './types';
import { equal } from './compare';
import { safe } from './paths';
import { writeAtomic } from './storage';
export class LocalTheme {
  readonly root: string;
  constructor(
    private settings: Settings,
    private options: SyncOptions,
    private base: () => Promise<Snapshot>,
  ) {
    this.root = path.resolve(settings.theme!.root!);
  }
  selected(name: string): boolean {
    return (
      (!this.options.only?.length || picomatch(this.options.only)(name)) &&
      !picomatch([
        ...(this.options.ignore ?? []),
        ...(this.settings.theme?.excludeFiles ?? []),
        '.uploader/**',
        'backup/**',
        '**/.*',
        '**/*.tmp',
      ])(name)
    );
  }
  async snapshot(): Promise<Snapshot> {
    const result: Snapshot = {};
    const folders = {
      templates: 'Asset::Template',
      snippets: 'Asset::Snippet',
      config: 'Asset::Configuration',
      media: 'Asset::Media',
    };
    for (const [folder, type] of Object.entries(folders)) {
      if (
        this.options.only?.length &&
        !this.options.only.some((pattern) => {
          const first = pattern.replace(/\\/g, '/').split('/')[0];
          return first === folder || /[*?\[\]{}!]/.test(first);
        })
      )
        continue;
      let entries;
      try {
        if ((await fs.lstat(path.join(this.root, folder))).isSymbolicLink())
          throw new UsageError('Символические ссылки не поддерживаются');
        entries = await fs.readdir(path.join(this.root, folder), { withFileTypes: true });
      } catch (error) {
        if (isRecord(error) && error.code === 'ENOENT' && !this.options.delete) continue;
        throw new UsageError(`Не удалось прочитать ${folder}`);
      }
      for (const entry of entries)
        if (entry.isFile()) {
          const name = `${folder}/${safe(entry.name)}`;
          if (this.selected(name))
            result[name] = {
              type,
              content: (await fs.readFile(path.join(this.root, name))).toString('base64'),
            };
        }
    }
    let handles: string[] = [];
    try {
      handles = await fs.readdir(path.join(this.root, 'widget_types'));
    } catch (error) {
      if (!(isRecord(error) && error.code === 'ENOENT')) throw error;
    }
    for (const handle of handles) {
      safe(handle);
      if ((await fs.lstat(path.join(this.root, 'widget_types', handle))).isSymbolicLink())
        throw new UsageError('Символические ссылки не поддерживаются');
      for (const definition of widgetFiles) {
        const name = `widget_types/${handle}/${definition.fileName}`;
        if (!this.selected(name)) continue;
        try {
          if ((await fs.lstat(path.join(this.root, name))).isSymbolicLink())
            throw new UsageError('Символические ссылки не поддерживаются');
          const buffer = await fs.readFile(path.join(this.root, name));
          result[name] = {
            type: 'widget',
            field: definition.uploadField ?? definition.apiField,
            content: buffer.toString('base64'),
          };
        } catch (error) {
          if (!(isRecord(error) && error.code === 'ENOENT')) throw error;
        }
      }
    }
    if (this.settings.theme?.assetsSync) {
      const base = await this.base();
      const groups = ['style', 'js', 'img', 'svg', 'media', 'fonts'];
      for (const group of groups) {
        let names: string[] = [];
        try {
          names = await fs.readdir(path.join(this.root, 'assets', group));
        } catch (error) {
          if (!(isRecord(error) && error.code === 'ENOENT')) throw error;
        }
        for (const file of names) {
          const name = `media/${safe(file)}`;
          if (!this.selected(name)) continue;
          const alias: Entry = {
            type: 'Asset::Media',
            content: (await fs.readFile(path.join(this.root, 'assets', group, file))).toString(
              'base64',
            ),
          };
          if (result[name] && !equal(result[name], alias)) {
            if (equal(result[name], base[name])) result[name] = alias;
            else if (!equal(alias, base[name]))
              throw new ConflictError(`Разные правки media/assets: ${file}`);
          } else result[name] = alias;
        }
      }
    }
    return result;
  }
  async mirror(name: string, entry?: Entry): Promise<void> {
    if (!this.settings.theme?.assetsSync || !name.startsWith('media/')) return;
    const extension = path.extname(name).toLowerCase();
    const group = ['.css', '.scss', '.less'].includes(extension)
      ? 'style'
      : ['.js', '.ts', '.coffee'].includes(extension)
        ? 'js'
        : extension === '.svg'
          ? 'svg'
          : ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico'].includes(extension)
            ? 'img'
            : ['.woff', '.woff2', '.ttf', '.otf', '.eot'].includes(extension)
              ? 'fonts'
              : 'media';
    for (const file of [
      path.join(this.root, name),
      path.join(this.root, 'assets', group, path.basename(name)),
    ]) {
      if (entry) await writeAtomic(this.root, file, Buffer.from(entry.content, 'base64'));
      else await fs.rm(file, { force: true });
    }
  }
}
