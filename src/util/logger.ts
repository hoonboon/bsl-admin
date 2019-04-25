import appRoot from "app-root-path";
import moment from "moment";
import * as winston from "winston";

const logLevel = process.env.LOG_LEVEL || "error";

const logFormat = winston.format.printf(info => {
    return `[${info.timestamp}][${info.pid || ""}][${info.label || ""}] ${info.level.toUpperCase()}: ${info.message}`;
});

const timestampFormat = winston.format(function(info, opts) {
    info.timestamp = moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ");
    return info;
});

const options = {
    file: {
        level: logLevel,
        filename: `${appRoot}/logs/app.log`,
        handleExceptions: true,
        json: true,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        colorize: false,
        format: winston.format.combine(
            timestampFormat(),
            winston.format.prettyPrint()
        ),
    },
    console: {
        level: logLevel,
        handleExceptions: true,
        json: false,
        colorize: true,
        format: winston.format.combine(
            timestampFormat(),
            logFormat
        ),
    },
};

// TODO: test transport in Heroku dev/ prod environment
const wlogger = winston.createLogger({
    transports: [
        new winston.transports.File(options.file),
        new winston.transports.Console(options.console),
    ],
    exitOnError: false, // do not exit on handled exceptions
});

interface LogInfo {
    label: string;
    pid: number;
    message: string;
}

export class Logger {
    private moduleLabel: string;
    constructor(moduleLabel: string) {
        this.moduleLabel = moduleLabel;
    }
    private composeMsg(msg: string): LogInfo {
        return {
            label: this.moduleLabel,
            pid: process.pid,
            message: msg
        };
    }
    debug(msg: string) {
        wlogger.debug(this.composeMsg(msg));
    }
    info(msg: string) {
        wlogger.info(this.composeMsg(msg));
    }
    warning(msg: string) {
        wlogger.warning(this.composeMsg(msg));
    }
    error(msg: string) {
        wlogger.error(this.composeMsg(msg));
    }
}

const logger = new Logger("util.logger");

logger.debug(`Logging initialized at level: ${logLevel}`);
