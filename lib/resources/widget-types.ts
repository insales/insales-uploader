import type { ResourceDefinition } from './definition';
import { UsageError } from '../errors';
export const widgetTypeResource: ResourceDefinition = {
  collection: (theme) => {
    if (!theme) throw new UsageError('Укажите --theme');
    return `/admin/themes/${encodeURIComponent(theme)}/widget_types`;
  },
  commands: ['list', 'get', 'create', 'update', 'delete'],
  validate(operation, body) {
    if (
      body.type !== undefined &&
      (typeof body.type !== 'string' ||
        !['SimpleWidgetType', 'BlockListWidgetType'].includes(body.type))
    )
      throw new UsageError('Неизвестный тип виджета');
    if (body.type === 'BlockListWidgetType' && !body.block_template_handle)
      throw new UsageError('Нужен block_template_handle');
    const enums: Record<string, string[]> = {
      page_kinds: [
        'all',
        'index',
        'collection',
        'product',
        'cart',
        'page',
        'search',
        'blog',
        'article',
        'compare',
        'favorite',
        'shared_cart',
      ],
      widget_list_kinds: [
        'header',
        'before_content',
        'content',
        'sidebar',
        'after_content',
        'footer',
        'outside',
        'top_panel',
        'bottom_panel',
      ],
    };
    for (const [field, values] of Object.entries(enums))
      if (
        body[field] !== undefined &&
        (!Array.isArray(body[field]) ||
          !(body[field] as unknown[]).every(
            (value) => typeof value === 'string' && values.includes(value),
          ))
      )
        throw new UsageError(`Некорректное поле ${field}`);
    if (operation === 'create') {
      for (const field of [
        'type',
        'name',
        'handle',
        'snippet_content',
        'generation',
        'page_kinds',
        'widget_list_kinds',
        'widget_category_handle',
      ])
        if (body[field] === undefined) throw new UsageError(`Нужно поле ${field}`);
      if (String(body.handle).startsWith('system_'))
        throw new UsageError('Префикс system_ зарезервирован');
    } else if ('handle' in body || 'type' in body)
      throw new UsageError('handle/type задаются при создании');
    for (const field of ['messages', 'settings_form', 'settings_data', 'setup'])
      if (typeof body[field] === 'string' && body[field]) JSON.parse(body[field]);
  },
};
