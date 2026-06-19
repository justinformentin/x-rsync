export class Logger {
  constructor(private quiet: boolean = false) {}

  info(message: string) {
    if (!this.quiet) console.log(message);
  }
  warn(message: string) {
    if (!this.quiet) console.warn(message);
  }
  error(message: string) {
    console.error(message);
  }
}
