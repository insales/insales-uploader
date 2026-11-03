export default async function queue<T, C>(
  tasks: ((this: C | undefined) => T | Promise<T>)[],
  context?: C,
): Promise<T[]> {
  const output: T[] = [];
  for (const task of tasks) output.push(await task.call(context));
  return output;
}
