export class Logger {
    constructor(quiet = false) {
        this.quiet = quiet;
    }
    info(message) {
        if (!this.quiet)
            console.log(message);
    }
    warn(message) {
        if (!this.quiet)
            console.warn(message);
    }
    error(message) {
        console.error(message);
    }
}
