import upath from 'upath';
export default function getPathKey(filePath) {
  const normalized = upath.normalize(filePath);
  const directory = upath.dirname(normalized);
  const parent = upath.basename(directory);
  const grandparent = upath.basename(upath.dirname(directory));
  if (grandparent === 'widget_types' || ['templates', 'snippets', 'config', 'media'].includes(parent)) return normalized;
  const root = grandparent === 'assets' ? upath.dirname(upath.dirname(directory)) : upath.dirname(directory);
  return upath.join(root, 'media', upath.basename(normalized));
}
