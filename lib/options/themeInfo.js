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
    theme.currentTheme = '';
    if (Number(theme.id) == options.theme.id) {
      theme.currentTheme = '[✔ текущая]';
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

  if (theme['is-published'] == 'true' || theme['is_published']) {
    type = 'Основная';
  }

  if (theme['is-mobile'] == 'true' || theme['is_mobile']) {
    type = 'Мобильная';
  }

  return type;
}
