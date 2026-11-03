import log from '../logger/log';
export class SessionTime {
  private handler?: () => void;
  start(stop: () => Promise<void>): void {
    this.stop();
    const started = performance.now();
    this.handler = () => {
      const total = Math.floor((performance.now() - started) / 1000);
      const formatted = [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60]
        .map((value) => String(value).padStart(2, '0'))
        .join(':');
      log(`Время сессии: ${formatted}`);
      void stop().catch((error) => {
        log(error);
        process.exitCode = 1;
      });
    };
    process.once('SIGINT', this.handler);
  }
  stop(): void {
    if (this.handler) process.removeListener('SIGINT', this.handler);
    this.handler = undefined;
  }
}
export default SessionTime;
