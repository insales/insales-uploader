import ansi from './ansi';
import log from './log';
import notifier from 'node-notifier';
export default {
  error(message: unknown): void {
    log(ansi.red(message));
    notifier.notify({ sound: true, title: 'Insales Uploader', message: String(message) });
  },
  blue: (message: unknown): void => log(ansi.blue(message)),
  green: (message: unknown): void => log(ansi.green(message)),
  red: (message: unknown): void => log(ansi.red(message)),
  white: (message: unknown): void => log(ansi.white(message)),
  bold: (message: unknown): void => log(ansi.bold(message)),
  magenta: (message: unknown): void => log(ansi.magenta(message)),
  send: (title: string, description: unknown): void => log(ansi.green(title), description),
};
