import app from './app.js'
import { env } from './config/env.js'
import { db, pool, verifyConnection } from './db/index.js'

const start = async () => {
  // 1. Verify database connectivity before accepting HTTP traffic
  try {
    await verifyConnection()
    console.log('✓ Database connection established')
  } catch (error) {
    console.error(
      '✗ Failed to connect to database:',
      error instanceof Error ? error.message : error,
    )
    // Attempt to clean up the pool; ignore errors since we're crashing anyway
    await db.destroy()
    process.exit(1)
  }

  // 2. Start HTTP server only after DB is confirmed healthy
  const server = app.listen(env.PORT, () => {
    console.log('Server is running on PORT:', env.PORT)
  })

  // 3. Graceful shutdown handler
  const shutdown = (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`)
    server.close(() => {
      db.destroy()
        .then(() => {
          console.log('Server shut down gracefully')
          process.exit(0)
        })
        .catch((err: unknown) => {
          console.error('Error during shutdown:', err)
          process.exit(1)
        })
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  // 4. Handle unexpected database errors during runtime
  // The pg pool emits 'error' when an idle client encounters a fatal error
  // (e.g., Postgres was restarted or the network dropped).
  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err)
    shutdown('POOL_ERROR')
  })
}

void start()