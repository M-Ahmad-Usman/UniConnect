import express from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { pinoHttp } from 'pino-http'

import middleware from './core/middleware/index.js'
import { logger } from './core/logger.js'

import type { Request, Response } from 'express'

const app = express()

app.use(express.json())

app.use(pinoHttp({
  logger,
  genReqId: req => req.headers['x-request-id'] ?? crypto.randomUUID(),

  serializers: {
    req: (request: Request) => ({
      id: request.id,
      method: request.method,
      url: request.url,
      query: request.query,
    }),
    res: (response: Response) => ({
      statusCode: response.statusCode,
    }),
  },
  autoLogging: {
    ignore: (request: Request) => request.path === '/favicon.ico',
  },
}))

app.use(helmet())
app.use(cookieParser())

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Hello World' })
})

// Intercept favicon before it hits the notFoundHandler
app.get('/favicon.ico', (_request: Request, response: Response) => {
  response.status(204).end()
})

app.use(middleware.notFoundHandler)
app.use(middleware.errorHandler)

export default app