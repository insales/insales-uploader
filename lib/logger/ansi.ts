import { styleText } from 'node:util';
const format =
  (color: Parameters<typeof styleText>[0]) =>
  (value: unknown): string =>
    styleText(color, String(value));
export default {
  red: format('red'),
  green: format('green'),
  blue: format('blue'),
  magenta: format('magenta'),
  cyan: format('cyan'),
  white: format('white'),
  gray: format('gray'),
  bgred: format('bgRed'),
  bold: format('bold'),
};
