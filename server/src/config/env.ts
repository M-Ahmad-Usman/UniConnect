import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, { error: "DATABASE_URL is required" }),

  JWT_ACCESS_SECRET: z.string().min(1, { error: "JWT_ACCESS_SECRET is required" }),
  JWT_REFRESH_SECRET: z.string().min(1, { error: "JWT_REFRESH_SECRET is required" }),
  JWT_ACCESS_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_EXPIRY: z.string().default("7d"),

  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    console.error("❌ Environment validation failed:\n" + formatted);
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();

export type Env = z.infer<typeof envSchema>;
