import { z } from 'zod'
import 'dotenv/config'

const envSchema = z.object({
  PORT: z.coerce.number().int().positive(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

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