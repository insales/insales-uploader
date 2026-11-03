import { Resources } from '../resources';
import { UsageError } from '../errors';
import { HttpError } from '../http/transport';
import { isRecord } from '../help/errors';
import widgetFiles from '../options/widgetFiles';
import path from 'node:path';
import type { Snapshot, Entry, Action } from './types';
import { safe } from './paths';
export class RemoteTheme {
  private remoteCache: Snapshot = {};
  constructor(
    private resources: Resources,
    private selected: (name: string) => boolean,
  ) {}
  invalidate(name: string): void {
    delete this.remoteCache[name];
  }
  async snapshot(): Promise<Snapshot> {
    const result: Snapshot = {};
    for (const asset of await this.resources.list('asset')) {
      const type = String(asset.type);
      const folder =
        type === 'Asset::Template'
          ? 'templates'
          : type === 'Asset::Snippet'
            ? 'snippets'
            : type === 'Asset::Configuration'
              ? 'config'
              : 'media';
      const name = `${folder}/${safe(String(asset.inner_file_name))}`;
      if (!this.selected(name)) continue;
      const bytes = await this.resources.transport.request(
        'GET',
        this.resources.path('asset', String(asset.id)).replace(/\.json$/, '/raw.json'),
        undefined,
        true,
      );
      if (!Buffer.isBuffer(bytes)) throw new Error('Ожидались байты ассета');
      result[name] = { type, id: String(asset.id), content: bytes.toString('base64') };
    }
    for (const widget of await this.resources.list('widget-type')) {
      const handle = safe(String(widget.handle));
      for (const definition of widgetFiles) {
        const name = `widget_types/${handle}/${definition.fileName}`;
        if (!this.selected(name)) continue;
        let content: Buffer;
        if (definition.type === 'info') {
          const info = Object.fromEntries(
            (definition.infoField ?? [])
              .filter((field) => widget[field] !== undefined)
              .map((field) => [field, widget[field]]),
          );
          content = Buffer.from(JSON.stringify(info, null, 2) + '\n');
        } else if (definition.type === 'url') {
          const url = widget[definition.apiField];
          if (typeof url !== 'string' || !url || url.includes('/missing.png')) continue;
          const response = await fetch(new URL(url, 'https://assets.insales.ru'), {
            redirect: 'error',
            signal: AbortSignal.timeout(30000),
          });
          if (!response.ok) throw new Error(`Ошибка скачивания превью: ${response.status}`);
          content = Buffer.from(await response.arrayBuffer());
        } else
          content = Buffer.from(
            typeof widget[definition.apiField] === 'string'
              ? (widget[definition.apiField] as string)
              : '',
          );
        result[name] = {
          type: 'widget',
          field: definition.uploadField ?? definition.apiField,
          id: String(widget.id),
          content: content.toString('base64'),
        };
      }
    }
    this.remoteCache = result;
    return result;
  }
  async entry(name: string): Promise<Entry | undefined> {
    const cached = this.remoteCache[name];
    if (!cached || name.startsWith('widget_types/')) return (await this.snapshot())[name];
    try {
      const bytes = await this.resources.transport.request(
        'GET',
        this.resources.path('asset', cached.id).replace(/\.json$/, '/raw.json'),
        undefined,
        true,
      );
      if (!Buffer.isBuffer(bytes)) throw new Error('Ожидались байты');
      return { ...cached, content: bytes.toString('base64') };
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return undefined;
      throw error;
    }
  }
  async write(action: Action, source: Snapshot): Promise<void> {
    const entry = action.source;
    if (action.path.startsWith('widget_types/')) {
      const handle = action.path.split('/')[1];
      const widgets = await this.resources.list('widget-type');
      const widget = widgets.find((item) => item.handle === handle);
      if (!entry) {
        if (!widget) return;
        if (action.path.endsWith('/info.json')) {
          await this.resources.write('widget-type', 'DELETE', String(widget.id));
          return;
        }
        await this.resources.write('widget-type', 'PUT', String(widget.id), {
          [action.target?.field ?? '']: '',
        });
        return;
      }
      const value = Buffer.from(entry.content, 'base64').toString('utf8');
      if (!widget) {
        const info = source[`widget_types/${handle}/info.json`];
        if (!info) throw new UsageError('Для создания нужен выбранный info.json и исходники');
        const data: unknown = JSON.parse(Buffer.from(info.content, 'base64').toString('utf8'));
        if (!isRecord(data)) throw new UsageError('Некорректный info.json');
        for (const definition of widgetFiles)
          if (definition.type === 'content') {
            const item = source[`widget_types/${handle}/${definition.fileName}`];
            if (item)
              data[definition.apiField] = Buffer.from(item.content, 'base64').toString('utf8');
          }
        if (typeof data.name === 'string') data.name = { ru: data.name };
        if (typeof data.description === 'string') data.description = { ru: data.description };
        await this.resources.write('widget-type', 'POST', undefined, data);
      } else {
        let body: Record<string, unknown>;
        if (entry.field === 'info') {
          const parsed: unknown = JSON.parse(value);
          if (!isRecord(parsed)) throw new UsageError('Некорректный info');
          body = Object.fromEntries(
            Object.entries(parsed).filter(
              ([key, v]) =>
                !['handle', 'type'].includes(key) &&
                JSON.stringify(
                  isRecord(v) && typeof v.ru === 'string' && Object.keys(v).length === 1 ? v.ru : v,
                ) !== JSON.stringify(widget[key]),
            ),
          );
        } else
          body = { [entry.field ?? '']: entry.field === 'preview_base64' ? entry.content : value };
        if (Object.keys(body).length)
          await this.resources.write('widget-type', 'PUT', String(widget.id), body);
      }
      return;
    }
    if (!entry) {
      await this.resources.write('asset', 'DELETE', action.target!.id);
      return;
    }
    const filename = path.basename(action.path);
    const bytes = Buffer.from(entry.content, 'base64');
    if (entry.type === 'Asset::Configuration') JSON.parse(bytes.toString('utf8'));
    const asset =
      entry.type === 'Asset::Media'
        ? { type: entry.type, name: filename, filename, attachment: entry.content }
        : {
            type: entry.type,
            name: filename.replace(/\.liquid$/, ''),
            content: bytes.toString('utf8'),
          };
    await this.resources.write('asset', action.target ? 'PUT' : 'POST', action.target?.id, {
      asset,
    });
  }
}
