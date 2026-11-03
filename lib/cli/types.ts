export interface Flags {
  cwd?: string;
  config?: string;
  profile?: string;
  theme?: string;
  json?: boolean;
  noInput?: boolean;
  input?: boolean;
  yes?: boolean;
}

export interface CommandFlags extends Flags {
  dryRun?: boolean;
  output?: string;
  raw?: boolean;
  all?: boolean;
  title?: string;
  description?: string;
  newName?: string;
}
