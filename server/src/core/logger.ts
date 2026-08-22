import pino from 'pino'

import { env } from '../config/env.js'

const level = env.NODE_ENV === 'production' ? 'info'
  : env.NODE_ENV === 'test' ? 'silent'
    : 'debug' // on development

const loggerOptions: pino.LoggerOptions = {
  level,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['*.password', '*.password_hash', '*.token', '*.secret'],
    remove: true,
  },
}

if (env.NODE_ENV === 'development') {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  }
}

export const logger = pino(loggerOptions)