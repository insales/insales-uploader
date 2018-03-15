'use strict';
import opn from 'opn';

// Открыть браузер
export default function openBrowser(url) {
  return new Promise((resolve, reject) => {
    opn(url)
      .then(() => {
        resolve()
      })
      .catch(() => {
        resolve()
      });
  });
}
