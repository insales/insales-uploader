export default function omitAssets(source: Record<string, unknown>, local: string[]) {
  const keys = new Set(local);
  return {
    serverError: local.filter((key) => !(key in source)),
    localError: Object.keys(source).filter((key) => !keys.has(key)),
  };
}
