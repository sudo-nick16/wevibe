enum LOG_LEVEL {
	LOG_INFO,
	LOG_ERROR,
	LOG_ALL,
}

export class Logger {
	level: LOG_LEVEL
	constructor(logLevel: LOG_LEVEL = LOG_LEVEL.LOG_ALL) {
		this.level = logLevel
	}
	log(...args: any[]) {
		console.log("[INFO] ", ...args);
	}
	info(...args: any[]) {
		if (this.level === LOG_LEVEL.LOG_ALL || this.level === LOG_LEVEL.LOG_INFO) {
			console.info("[INFO] ", ...args);
		}
	}
	error(...args: any[]) {
		if (this.level === LOG_LEVEL.LOG_ALL || this.level === LOG_LEVEL.LOG_ERROR) {
			console.error("[ERROR] ", ...args);
		}
	}
}

export const logger = new Logger();
