import colors from 'ansi-colors';
import supportsColor from 'color-support';

const hasColors = supportsColor();

function noColor(message) {
  return message;
}

const ansi = {
  red: hasColors ? colors.red : noColor,
  green: hasColors ? colors.green : noColor,
  blue: hasColors ? colors.blue : noColor,
  magenta: hasColors ? colors.magenta : noColor,
  cyan: hasColors ? colors.cyan : noColor,
  white: hasColors ? colors.white : noColor,
  gray: hasColors ? colors.gray : noColor,
  bgred: hasColors ? colors.bgred : noColor,
  bold: hasColors ? colors.bold : noColor,
};

export default ansi;
