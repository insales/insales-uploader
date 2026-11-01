export default async function queue(tasks, instance) {
  const output = [];
  for (const task of tasks) output.push(await task.call(instance));
  return output;
}
