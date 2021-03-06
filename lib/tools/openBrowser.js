'use strict';
import opn from 'opn';

/**
 * Открыть браузер
 * @param  {string} url
 */
export default function openBrowser(url) {
  return new Promise((resolve) => {
    opn(url)
      .then(() => {
        resolve();
      })
      .catch(() => {
        resolve();
      });
  });
}
