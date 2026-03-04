import app from './app.js'
import { env } from './config/env.js'
import { db } from './db/index.js'

const server = app.listen(env.PORT, () =>
  console.log('server is running on PORT:', env.PORT),
)

const shutdown = () => {
  server.close(() => {
    db.destroy().then(() => {
      console.log('Server shut down gracefully')
      process.exit(0)
    }).catch((err: unknown) => {
      console.error('Error during shutdown:', err)
      process.exit(1)
    })
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)