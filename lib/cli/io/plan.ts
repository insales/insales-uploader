import type { Plan } from '../../sync/types';
export function view(plan: Plan, diff = false): unknown {
  return {
    direction: plan.direction,
    actions: plan.actions.map((action) => ({
      path: action.path,
      kind: action.kind,
      ...(diff && action.kind !== 'unchanged'
        ? {
            before: action.target
              ? Buffer.from(action.target.content, 'base64').toString('utf8')
              : null,
            after: action.source
              ? Buffer.from(action.source.content, 'base64').toString('utf8')
              : null,
          }
        : {}),
    })),
  };
}
