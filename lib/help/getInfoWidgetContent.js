export default function getInfoWidgetContent(widgetType, field) {
  let result = {};
  field.forEach((item, i) => {
    if (widgetType[item]) {
      if (item == 'type') {
        result[item] = widgetType['widget_type']
      }else{
        result[item] = widgetType[item]
      }
    }
  });

  return JSON.stringify(result, null, 2);
}
