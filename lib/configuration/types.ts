export interface Settings {
  account: { id: string; token: string; url: string; http?: boolean };
  theme?: { id?: string; root?: string; assetsSync?: boolean; excludeFiles?: string[] };
}
