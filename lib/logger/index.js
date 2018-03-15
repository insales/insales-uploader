import ansi from './ansi';
import log from 'fancy-log';
const notifier = require('node-notifier');

let defaultNotifier = {
  sound: true,
  title: 'Insales Uploader',
  message: ''
}

export default {
  error: (msg) => {
    log(ansi.red(msg));
    defaultNotifier.message = msg;
    notifier.notify(defaultNotifier);
  },
  blue: (msg) => {
    log(ansi.blue(msg));
  },
  green: (msg) => {
    log(ansi.green(msg));
  },
  red: (msg) => {
    log(ansi.red(msg));
  },
  white: (msg) => {
    log(ansi.white(msg));
  },
  bold: (msg) => {
    log(ansi.bold(msg));
  },
  send: (title, description) => {
    log(ansi.green(title) + ' ' + description);
  },
  magenta: (msg) => {
    log(ansi.magenta(msg));
  }
}
