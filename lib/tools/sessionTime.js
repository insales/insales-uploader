'use strict';
import moment from 'moment';
import log from 'fancy-log';

/**
 * Время сессии
 */
export default function sessionTime () {
  return new Promise((resolve, reject) => {
    moment.locale('ru')
    let now = moment();

    if (this.sessionSignalHandler) process.removeListener('SIGINT', this.sessionSignalHandler);
    this.sessionSignalHandler = () => {
      let end = moment();
      let diff = moment(end).unix() - moment(now).unix();

      let sessionEnd = moment.utc(diff * 1000).format('HH:mm:ss');
      log(`Время сессии: [${sessionEnd}]`);
      process.exit(0);
    };
    process.once('SIGINT', this.sessionSignalHandler);

    resolve();
  });
}
