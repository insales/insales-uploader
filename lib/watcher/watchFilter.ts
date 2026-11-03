import path from 'node:path';
import type { Stats } from 'node:fs';
import type { ChokidarOptions } from 'chokidar';
import upath from 'upath';
import picomatch from 'picomatch';
import type { NormalizedOptions, ProjectPaths } from '../types';

const TEMPORARY_FILES = [
  '**/*.DS_Store',
  '**/*.log',
  '**/*.temp',
  '**/*.tmp',
  '**/*._t_',
  '**/*.crdownload',
  '**/*___jb_tmp___',
];

type IgnoreRule = NonNullable<ChokidarOptions['ignored']>;
type SingleIgnoreRule = Exclude<IgnoreRule, unknown[]>;

function matchesRule(
  rule: SingleIgnoreRule,
  absolute: string,
  relative: string,
  cwd: string,
  stats?: Stats,
): boolean {
  if (typeof rule === 'function') return rule(absolute, stats);
  if (rule instanceof RegExp) {
    rule.lastIndex = 0;
    return rule.test(absolute);
  }
  if (typeof rule === 'string') {
    const matches = picomatch(rule, { dot: true });
    return matches(upath.normalize(absolute)) || matches(relative);
  }

  const target = path.resolve(cwd, rule.path);
  const nested = path.relative(target, absolute);
  if (nested === '') return true;
  return !!rule.recursive && !nested.startsWith('..') && !path.isAbsolute(nested);
}

export class WatchFilter {
  private readonly cwd: string;
  private readonly excluded: picomatch.Matcher;
  private readonly rules: SingleIgnoreRule[];
  private readonly directories: Set<string>;

  constructor(
    private paths: ProjectPaths,
    options: NormalizedOptions,
  ) {
    this.cwd = options.chokidarOptions.cwd || process.cwd();
    const exclusions = options.theme.excludeFiles.map((pattern) => pattern.replace(/\\/g, '/'));
    this.excluded = picomatch([...TEMPORARY_FILES, ...exclusions], { dot: true });
    const ignored = options.chokidarOptions.ignored;
    this.rules = ignored === undefined ? [] : Array.isArray(ignored) ? ignored : [ignored];
    this.directories = new Set(
      Object.values(paths.folders).map((folder) => upath.normalize(folder).replace(/\/$/, '')),
    );
  }

  absolute(file: string): string {
    return path.resolve(this.cwd, file);
  }

  ignored(file: string, stats?: Stats): boolean {
    const absolute = this.absolute(file);
    const relative = upath.normalize(path.relative(this.paths.root, absolute));
    return (
      this.excluded(relative) ||
      this.rules.some((rule) => matchesRule(rule, absolute, relative, this.cwd, stats))
    );
  }

  eligible(absolute: string): boolean {
    const relative = upath.normalize(path.relative(this.paths.root, absolute));
    if (relative.startsWith('../') || path.isAbsolute(relative)) return false;
    if (!path.basename(absolute).includes('.')) return false;

    // Themes contain flat asset folders; widget sources live under widget handles.
    if (relative.startsWith('widget_types/')) return relative.split('/').length >= 3;
    return this.directories.has(upath.normalize(path.dirname(absolute)));
  }
}
