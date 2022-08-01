export default function getInfoWidgetContent(widgetType, field) {
  let result = {};
  field.forEach((item, i) => {
    if (widgetType[item]) {
      if (item == 'type') {
        result[item] = widgetType['widget_type']
      } else if (typeof (widgetType[item]) == 'string' && (item == 'name' || item == 'description')) {
        result[item] = {
          ru: widgetType[item]
        }
      } else {
        result[item] = widgetType[item]
      }
    }
  });

  return JSON.stringify(result, null, 2);
}
