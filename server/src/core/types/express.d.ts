import type { HttpLogger } from 'pino-http'

declare global {
  namespace Express {
    interface Request {
      requestId: string
      log: HttpLogger['logger']
      user?: {
        publicId: string
      }
    }
  }
}

// This empty export is required to make TypeScript treat this file as a
// "module" rather than a "script". Without it, the 'declare global' block
// may not work correctly in all TypeScript configurations.
export {}