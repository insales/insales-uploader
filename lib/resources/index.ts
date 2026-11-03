import { validateBody } from './validation';
export { validateBody } from './validation';
import { isRecord } from '../help/errors';
import { UsageError } from '../errors';
import { HttpError, Transport, type Method } from '../http/transport';
import { resourceDefinitions, type Resource } from './catalog';
export type { Resource } from './catalog';
export class Resources {
  constructor(
    readonly transport: Transport,
    readonly theme?: string,
  ) {}
  path(resource: Resource, id?: string): string {
    const base = resourceDefinitions[resource].collection(this.theme);
    return `${base}${id === undefined ? '' : `/${encodeURIComponent(id)}`}.json`;
  }
  async list(resource: Resource): Promise<Record<string, unknown>[]> {
    const result: Record<string, unknown>[] = [];
    for (let page = 1; ; page++) {
      const data = await this.transport.request(
        'GET',
        this.path(resource) +
          (resourceDefinitions[resource].paginated ? `?page=${page}&per_page=100` : ''),
      );
      if (!Array.isArray(data) || !data.every(isRecord)) throw new Error('Некорректный список');
      result.push(...data);
      if (!resourceDefinitions[resource].paginated || data.length < 100) return result;
    }
  }
  async get(resource: Resource, id: string): Promise<Record<string, unknown>> {
    const data = await this.transport.request('GET', this.path(resource, id));
    if (!isRecord(data)) throw new Error('Некорректный ответ');
    return data;
  }
  async write(
    resource: Resource,
    method: Method,
    id: string | undefined,
    body?: unknown,
    suffix?: string,
  ): Promise<unknown> {
    if (resource === 'theme' && method === 'DELETE' && (await this.get(resource, id!)).is_published)
      throw new UsageError('Нельзя удалить опубликованную тему');
    validateBody(resource, method === 'POST' ? 'create' : 'update', body);
    if (
      resource === 'asset' &&
      method === 'PUT' &&
      id &&
      isRecord(body) &&
      isRecord(body.asset) &&
      typeof body.asset.content === 'string'
    ) {
      const metadata = await this.get(resource, id);
      if (metadata.type === 'Asset::Configuration') JSON.parse(body.asset.content);
    }
    const data = await this.transport.request(
      method,
      this.path(resource, id).replace(/\.json$/, suffix ? `/${suffix}.json` : '.json'),
      body,
    );
    if (isRecord(data) && data.status === 'error') throw new Error('API отклонил операцию');
    if (method === 'DELETE') {
      try {
        await this.get(resource, id!);
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) return { deleted: id };
        throw error;
      }
      throw new Error('API не удалил ресурс');
    }
    return resource === 'theme' && id ? this.get(resource, id) : data;
  }
}
