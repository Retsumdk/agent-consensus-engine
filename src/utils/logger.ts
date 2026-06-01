
export class Logger {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  private log(level: string, message: string, color: string) {
    const timestamp = new Date().toISOString();
    console.log(`${color}[${timestamp}] [${level}] [${this.name}] ${message}\x1b[0m`);
  }

  info(message: string) {
    this.log("INFO", message, "\x1b[34m");
  }

  success(message: string) {
    this.log("SUCCESS", message, "\x1b[32m");
  }

  warn(message: string) {
    this.log("WARN", message, "\x1b[33m");
  }

  error(message: string) {
    this.log("ERROR", message, "\x1b[31m");
  }

  debug(message: string) {
    this.log("DEBUG", message, "\x1b[90m");
  }
}
