import pino from 'pino'
import pretty from 'pino-pretty'
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

const stream = env.NODE_ENV === 'development'
  ? pretty({
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  })
  : undefined

export const logger = pino(loggerOptions, stream)