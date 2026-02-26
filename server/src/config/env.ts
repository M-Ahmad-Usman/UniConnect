import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, { error: "DATABASE_URL is required" }),

  JWT_ACCESS_SECRET: z.string().min(1, { error: "JWT_ACCESS_SECRET is required" }),
  JWT_REFRESH_SECRET: z.string().min(1, { error: "JWT_REFRESH_SECRET is required" }),
  JWT_ACCESS_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_EXPIRY: z.string().default("7d"),

  RESET_PASSWORD_SECRET: z.string().min(1, { error: "RESET_PASSWORD_SECRET is required" }),
  RESET_PASSWORD_EXPIRY: z.string().default("1h"),

  RESEND_API_KEY: z.string().min(1, { error: "RESEND_API_KEY is required" }),
  RESEND_FROM_EMAIL: z.string().email({ error: "RESEND_FROM_EMAIL must be a valid email" }),

  CLOUDINARY_CLOUD_NAME: z.string().min(1, { error: "CLOUDINARY_CLOUD_NAME is required" }),
  CLOUDINARY_API_KEY: z.string().min(1, { error: "CLOUDINARY_API_KEY is required" }),
  CLOUDINARY_API_SECRET: z.string().min(1, { error: "CLOUDINARY_API_SECRET is required" }),

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
