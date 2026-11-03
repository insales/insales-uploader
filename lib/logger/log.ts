export default function log(...values: unknown[]): void {
  console.log(`[${new Date().toTimeString().slice(0, 8)}]`, ...values);
}
