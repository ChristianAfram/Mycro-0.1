import log from 'electron-log';
import path from 'path';
import { app } from 'electron';

const logPath = path.join(app.getPath('userData'), 'logs');

log.transports.file.resolvePathFn = () => path.join(logPath, 'mycro.log');
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.transports.file.maxSize = 5 * 1024 * 1024;

export const logger = {
  info: (message: string, ...args: unknown[]) => log.info(message, ...args),
  warn: (message: string, ...args: unknown[]) => log.warn(message, ...args),
  error: (message: string, ...args: unknown[]) => log.error(message, ...args),
  debug: (message: string, ...args: unknown[]) => log.debug(message, ...args),
};

export default logger;