/**
 * Получить тип ассета
 * @param {string} path
 */
export default function getAssetType(parentDir) {
  const assetTypes = {
    templates: 'Asset::Template',
    snippets: 'Asset::Snippet',
    config: 'Asset::Configuration',
    media: 'Asset::Media',
    widget_types: 'Asset::Widget'
  };

  let assetType = assetTypes[parentDir];

  // если не стандартная директория то Asset::Media
  if (typeof assetType == 'undefined') {
    assetType = 'Asset::Media';
  }

  return assetType;
}
