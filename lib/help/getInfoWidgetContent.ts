import type { Asset } from '../types';
export default function getInfoWidgetContent(widget: Asset, fields: string[]): string {
  const result: Record<string, unknown> = {};
  for (const key of fields) {
    const value = widget[key];
    if (value == null) continue;
    result[key] =
      key === 'type'
        ? widget.widget_type
        : typeof value === 'string' && ['name', 'description'].includes(key)
          ? { ru: value }
          : value;
  }
  return JSON.stringify(result, null, 2);
}
