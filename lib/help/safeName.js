export function safeName(name) {
  if (typeof name !== 'string' || !name || name === '.' || name === '..' || /[<>:"/\\|?*\x00-\x1f]/.test(name) || /[ .]$/.test(name) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) {
    throw new Error(`Invalid file name: ${name}`);
  }
  return name;
}
