import { z } from 'zod'
import 'dotenv/config'

const envSchema = z.object({
  PORT: z.coerce.number().int().positive(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.string().min(1, { error: 'DATABASE_URL is required' }),
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