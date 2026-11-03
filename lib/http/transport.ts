import type { Settings } from '../configuration/types';
import { UsageError } from '../errors';
export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
export class Transport {
  private until = 0;
  constructor(
    private settings: Settings,
    private signal?: AbortSignal,
  ) {}
  async request(method: Method, resource: string, body?: unknown, raw = false): Promise<unknown> {
    const origin = `${this.settings.account.http ? 'http' : 'https'}://${this.settings.account.url}`;
    const url = new URL(resource, origin);
    if (
      !resource.startsWith('/admin/') ||
      url.origin !== origin ||
      !url.pathname.startsWith('/admin/') ||
      /%2f|%5c/i.test(resource) ||
      resource.includes('\\')
    )
      throw new UsageError('Допустим только относительный путь внутри /admin/');
    for (let attempt = 0; ; attempt++) {
      if (this.signal?.aborted) throw Object.assign(new Error('Отменено'), { exitCode: 130 });
      if (this.until > Date.now())
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(done, this.until - Date.now());
          const abort = () => {
            clearTimeout(timer);
            this.signal?.removeEventListener('abort', abort);
            reject(new Error('Отменено'));
          };
          const signal = this.signal;
          function done() {
            signal?.removeEventListener('abort', abort);
            resolve();
          }
          signal?.addEventListener('abort', abort, { once: true });
        });
      let response: Response;
      try {
        response = await fetch(url, {
          method,
          redirect: 'error',
          signal: this.signal
            ? AbortSignal.any([this.signal, AbortSignal.timeout(30000)])
            : AbortSignal.timeout(30000),
          headers: {
            Authorization: `Basic ${Buffer.from(`${this.settings.account.id}:${this.settings.account.token}`).toString('base64')}`,
            Accept: 'application/json',
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
      } catch {
        if (this.signal?.aborted) throw Object.assign(new Error('Отменено'), { exitCode: 130 });
        if (method === 'GET' && attempt < 2 && !this.signal?.aborted) continue;
        throw new Error(
          `${method} ${url.pathname}: запрос не завершён; результат записи неизвестен`,
        );
      }
      if (response.status === 429) {
        const seconds = Number(response.headers.get('retry-after') ?? '300');
        this.until = Date.now() + (Number.isFinite(seconds) ? Math.max(seconds, 0) : 300) * 1000;
        if (method === 'GET' && attempt < 2) {
          await response.body?.cancel();
          continue;
        }
      }
      const usage = response.headers.get('api-usage-limit')?.split('/').map(Number);
      if (usage && usage[0] >= usage[1]) this.until = Date.now() + 300000;
      if (method === 'GET' && response.status >= 500 && attempt < 2) {
        await response.body?.cancel();
        continue;
      }
      if (!response.ok) {
        const text = (await response.text())
          .slice(0, 8192)
          .split(this.settings.account.token)
          .join('[redacted]');
        let details: unknown;
        try {
          details = JSON.parse(text) as unknown;
        } catch {
          details = { status: response.status };
        }
        throw new HttpError(
          response.status,
          `InSales API ${response.status}: ${method} ${url.pathname}`,
          details,
        );
      }
      if (raw) return Buffer.from(await response.arrayBuffer());
      const text = await response.text();
      if (!text) return null;
      try {
        return JSON.parse(text) as unknown;
      } catch {
        throw new Error(`Некорректный JSON: ${method} ${url.pathname}`);
      }
    }
  }
}
