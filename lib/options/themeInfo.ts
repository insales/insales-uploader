import type { NormalizedOptions, Theme, ThemeList } from '../types';
export default function themeInfo(options: NormalizedOptions, themes: Theme[]): ThemeList {
  const list = themes.map((theme) => ({
    ...theme,
    type:
      theme['is-mobile'] === 'true' || theme.is_mobile
        ? 'Мобильная'
        : theme['is-published'] === 'true' || theme.is_published
          ? 'Основная'
          : 'Альтернативная',
    currentTheme: Number(theme.id) === Number(options.theme.id) ? '[✔ текущая]' : '',
  }));
  return { list, current: list.find((theme) => Number(theme.id) === Number(options.theme.id)) };
}
