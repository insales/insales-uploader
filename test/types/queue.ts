import {TaskManager} from '../../lib/taskManager';
import type {FileTasks} from '../../lib/types';
import createClient from '../../lib/insalesApi/client';

const files = new TaskManager<FileTasks>();
files.create('file:write', task => task.content);
files.create('file:writeWithDownload', task => task.url);
void files.run('file:write', [{path: 'a.txt', content: ''}]);
void files.run('file:writeWithDownload', [{path: 'a.txt', url: 'https://example.com/a'}]);

// @ts-expect-error Download tasks require a URL.
void files.run('file:writeWithDownload', [{path: 'a.txt', content: 'wrong task'}]);
// @ts-expect-error Write tasks require bytes or text.
void files.run('file:write', [{path: 'a.txt', url: 'https://example.com/a'}]);
// @ts-expect-error Unknown task names are caught before runtime.
void files.run('file:typo', []);
// @ts-expect-error Deduplication keys must belong to the task payload.
files.create('file:write', () => {}, 'notAField');

const api = createClient({id: 1});
// @ts-expect-error An asset operation requires both theme and asset identifiers.
void api.getAsset({token: 'fixture', url: 'example.com', theme: 42});
// @ts-expect-error Theme operations cannot accidentally use an account-only connection.
void api.listAsset({token: 'fixture', url: 'example.com'});
