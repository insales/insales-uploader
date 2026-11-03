export interface ResourceDefinition {
  collection(theme?: string): string;
  commands: readonly string[];
  paginated?: boolean;
  validate?(operation: string, body: Record<string, unknown>): void;
}
