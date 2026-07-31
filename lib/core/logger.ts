// lib/core/logger.ts

import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf, json, errors } = format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}] ${stack || message}`;
});

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    errors({ stack: true }),
    process.env.NODE_ENV === 'production' ? json() : logFormat
  ),
  transports: [new transports.Console()],
});
