import { z } from 'zod'
import 'dotenv/config'

import type { SignOptions } from 'jsonwebtoken'
type JwtExpiresIn = NonNullable<SignOptions['expiresIn']>

const timeStringSchema = z
  .string()
  .regex(/^\d+[smhdw]$/, { message: "Must be a valid duration (e.g., '15m', '2h', '7d')" })
  .transform((val) => val as JwtExpiresIn)

const envSchema = z.object({
  PORT: z.coerce.number().int().positive(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  JWT_ISSUER: z.string(),
  JWT_AUDIENCE: z.string(),

  ACCESS_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: timeStringSchema.default('15m'),

  REFRESH_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_TTL: timeStringSchema.default('7d'),

  POSTGRES_PASSWORD: z.string().min(5),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_DB: z.string().min(1),
  HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive(),
})

type Env = z.infer<typeof envSchema>

function main(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')

    console.error('❌ Environment validation failed:\n' + formatted)
    process.exit(1)
  }

  return result.data
}

export const env: Env = main()