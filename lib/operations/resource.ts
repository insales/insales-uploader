import fs from 'node:fs/promises';
import path from 'node:path';
import { UsageError } from '../errors';
import { Resources, validateBody, type Resource } from '../resources';
import { safeName } from '../help/safeName';
export interface ResourceOptions {
  cwd?: string;
  output?: string;
  raw?: boolean;
  all?: boolean;
  dryRun?: boolean;
  title?: string;
  description?: string;
  newName?: string;
}
export async function operateResource(
  resources: Resources,
  resource: Resource,
  name: string,
  args: unknown[],
  flags: ResourceOptions,
  input?: unknown,
): Promise<unknown> {
  const id = typeof args[0] === 'string' ? args[0] : undefined;
  let data: unknown;
  if (name === 'list') data = await resources.list(resource);
  else if (name === 'get')
    data = flags.raw
      ? await resources.transport.request(
          'GET',
          resources.path(resource, id).replace(/\.json$/, '/raw.json'),
          undefined,
          true,
        )
      : await resources.get(resource, id!);
  else if (name === 'download') {
    if (!flags.output || !!id === !!flags.all)
      throw new UsageError('Укажите ID либо --all и --output');
    const files = flags.all ? await resources.list('file') : [await resources.get('file', id!)];
    const downloads = files.map((file) => {
      const url = new URL(String(file.absolute_url));
      const filename = decodeURIComponent(url.pathname.split('/').pop() ?? '').replace(
        /[ .]+$/,
        '',
      );
      if (
        !filename ||
        /[\\/:]|^\.+$/.test(filename) ||
        /[. ]$/.test(filename) ||
        /^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(filename)
      )
        throw new UsageError('Небезопасное имя файла');
      safeName(filename);
      safeName(String(file.id));
      return {
        url,
        target: flags.all
          ? path.join(flags.output!, `${String(file.id)}-${filename}`)
          : path.resolve(flags.output!),
      };
    });
    if (!flags.dryRun)
      for (const item of downloads) {
        const response = await fetch(item.url, {
          redirect: 'error',
          signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) throw new Error(`Скачивание: ${response.status}`);
        await fs.mkdir(path.dirname(item.target), { recursive: true });
        await fs.writeFile(item.target, Buffer.from(await response.arrayBuffer()), {
          flag: 'wx',
        });
      }
    data = downloads.map((item) => ({ path: item.target, dryRun: !!flags.dryRun }));
  } else if (name === 'upload') {
    const results: unknown[] = [];
    for (const argument of args[0] as string[]) {
      const file = path.resolve(flags.cwd ?? process.cwd(), argument);
      const body = {
        file: {
          filename: path.basename(file),
          attachment: (await fs.readFile(file)).toString('base64'),
        },
      };
      results.push(
        flags.dryRun
          ? { filename: body.file.filename }
          : await resources.write(resource, 'POST', undefined, body),
      );
    }
    data = results;
  } else {
    const body =
      name === 'delete'
        ? undefined
        : name === 'publish'
          ? {}
          : name === 'rename'
            ? {
                asset: {
                  new_name:
                    flags.newName ??
                    (() => {
                      throw new UsageError('Нужно --new-name');
                    })(),
                },
              }
            : resource === 'theme'
              ? {
                  theme: {
                    ...(flags.title === undefined ? {} : { title: flags.title }),
                    ...(flags.description === undefined ? {} : { description: flags.description }),
                  },
                }
              : input;
    validateBody(resource, name, body);
    if (flags.dryRun) {
      if (id) await resources.get(resource, id);
      data = { resource, operation: name, id, dryRun: true };
    } else
      data = await resources.write(
        resource,
        name === 'create' ? 'POST' : name === 'delete' ? 'DELETE' : 'PUT',
        id,
        body,
        ['publish', 'rename'].includes(name) ? name : undefined,
      );
  }
  if (flags.output && name === 'get' && !flags.dryRun) {
    await fs.writeFile(flags.output, Buffer.isBuffer(data) ? data : JSON.stringify(data, null, 2), {
      flag: 'wx',
    });
    data = { path: path.resolve(flags.output) };
  }
  return data;
}
