'use strict';
/**
 * Получить информацию по текущей теме
 * @param  {object} options глобальные настройки
 * @param  {array} themes  массив тем
 */
export default function themeInfo(options, themes) {
  let currentTheme = {
    list: themes
  }

  themes.forEach((theme) => {
    theme.type = typeTheme(theme);
    if (Number(theme.id) == options.theme.id) {
      currentTheme.current = theme;
    }
  });

  return currentTheme;
}

/**
* Узнать тип темы
*/
function typeTheme(theme) {
  let type = 'Альтернативная';

  if (theme['is-published'] == 'true') {
    type = 'Основная';
  }

  if (theme['is-mobile'] == 'true') {
    type = 'Мобильная';
  }

  return type;
}
