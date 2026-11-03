import { isRecord } from '../help/errors';
import type { AssetInfo, ClientConfig, Id, RemoteAsset, Theme } from '../types';

export interface Connection {
  token: string;
  url: string;
  query?: Record<string, string | number>;
}
export interface ThemeConnection extends Connection {
  theme: Id;
}
export interface AssetConnection extends ThemeConnection {
  assetId: Id;
}
export interface WidgetConnection extends ThemeConnection {
  widgetId: Id;
}
export interface ResponseInfo {
  statusCode: number;
  headers: Record<string, string>;
}
export interface ApiResult<T> {
  data: T;
  response: ResponseInfo;
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ResponseMode = 'json' | 'text' | 'buffer';
type WidgetPayload = Record<string, unknown>;
type FilePayload = { file: { filename: string; attachment: string } };

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response: ResponseInfo & { data: unknown },
  ) {
    super(message);
  }
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function assetName(value: unknown): RemoteAsset['name'] {
  if (value == null) return undefined;
  if (typeof value === 'string' || isRecord(value)) return value;
  throw new Error('Invalid asset name');
}

export function remoteAsset(value: unknown): RemoteAsset {
  if (!isRecord(value)) throw new Error('Invalid asset response');
  return {
    ...value,
    type: optionalString(value.type) ?? '',
    id: typeof value.id === 'string' || typeof value.id === 'number' ? value.id : undefined,
    name: assetName(value.name),
    handle: optionalString(value.handle),
    inner_file_name: optionalString(value.inner_file_name),
    human_readable_name: optionalString(value.human_readable_name),
    'human-readable-name': optionalString(value['human-readable-name']),
    asset_url: value.asset_url === null ? null : optionalString(value.asset_url),
    content: value.content === null ? null : optionalString(value.content),
  };
}

export function remoteTheme(value: unknown): Theme {
  if (!isRecord(value) || (typeof value.id !== 'number' && typeof value.id !== 'string')) {
    throw new Error('Invalid theme response');
  }
  return { ...value, id: value.id, title: optionalString(value.title) };
}

async function readResponse(
  response: Response,
  mode: ResponseMode,
  operation: string,
): Promise<unknown> {
  if (response.ok && mode === 'buffer') return Buffer.from(await response.arrayBuffer());

  const text = await response.text();
  if (!text || (response.ok && mode === 'text')) return text;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    if (response.ok) throw new Error(`Invalid JSON response: ${operation}`);
    // Preserve readable error bodies even when the server returns HTML or text.
    return text;
  }
}

function assetsResource(connection: ThemeConnection): string {
  return `themes/${encodeURIComponent(String(connection.theme))}/assets`;
}
function widgetsResource(connection: ThemeConnection): string {
  return `themes/${encodeURIComponent(String(connection.theme))}/widget_types`;
}
function assetResource(connection: AssetConnection): string {
  return `${assetsResource(connection)}/${encodeURIComponent(String(connection.assetId))}`;
}
function widgetResource(connection: WidgetConnection): string {
  return `${widgetsResource(connection)}/${encodeURIComponent(String(connection.widgetId))}`;
}

export default function createClient(config: ClientConfig) {
  async function request(
    connection: Connection,
    method: Method,
    resource: string,
    body?: unknown,
    mode: ResponseMode = 'json',
  ): Promise<ApiResult<unknown>> {
    const protocol = config.http ? 'http' : 'https';
    const url = new URL(`/admin/${resource}.json`, `${protocol}://${connection.url}`);
    for (const [key, value] of Object.entries(connection.query ?? {})) {
      url.searchParams.set(key, String(value));
    }
    const credentials = Buffer.from(`${config.id}:${connection.token}`).toString('base64');
    const response = await fetch(url, {
      method,
      redirect: 'error',
      signal: AbortSignal.timeout(config.timeout || 30000),
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    // Diagnostics contain neither credentials nor query values.
    const operation = `${method} ${url.pathname}`;
    const data = await readResponse(response, mode, operation);
    const info = { statusCode: response.status, headers: Object.fromEntries(response.headers) };
    if (!response.ok) {
      throw new ApiError(`InSales API ${response.status}: ${operation}`, response.status, {
        ...info,
        data,
      });
    }
    return { data, response: info };
  }

  return {
    listThemes: (connection: Connection) => request(connection, 'GET', 'themes'),
    listAsset: (connection: ThemeConnection) =>
      request(connection, 'GET', assetsResource(connection)),
    async getAsset(connection: AssetConnection): Promise<ApiResult<RemoteAsset>> {
      const result = await request(connection, 'GET', assetResource(connection));
      return { ...result, data: remoteAsset(result.data) };
    },
    async getAssetRaw(
      connection: AssetConnection & { binary?: boolean },
    ): Promise<ApiResult<string | Buffer>> {
      const mode = connection.binary ? 'buffer' : 'text';
      const result = await request(
        connection,
        'GET',
        `${assetResource(connection)}/raw`,
        undefined,
        mode,
      );
      if (typeof result.data !== 'string' && !Buffer.isBuffer(result.data)) {
        throw new Error('Invalid raw asset response');
      }
      return { ...result, data: result.data };
    },
    uploadAsset: (connection: ThemeConnection & { asset: AssetInfo }) =>
      request(connection, 'POST', assetsResource(connection), { asset: connection.asset }),
    editAsset: (connection: AssetConnection & { asset: AssetInfo }) =>
      request(connection, 'PUT', assetResource(connection), { asset: connection.asset }),
    removeAsset: (connection: AssetConnection) =>
      request(connection, 'DELETE', assetResource(connection)),
    listWidgetTypes: (connection: ThemeConnection) =>
      request(connection, 'GET', widgetsResource(connection)),
    uploadWidgetType: (connection: ThemeConnection & { data: WidgetPayload }) =>
      request(connection, 'POST', widgetsResource(connection), connection.data),
    editWidgetType: (connection: WidgetConnection & { data: WidgetPayload }) =>
      request(connection, 'PUT', widgetResource(connection), connection.data),
    removeWidgetType: (connection: WidgetConnection) =>
      request(connection, 'DELETE', widgetResource(connection)),
    listFile: (connection: Connection) => request(connection, 'GET', 'files'),
    uploadFile: (connection: Connection & { files: FilePayload }) =>
      request(connection, 'POST', 'files', connection.files),
  };
}
