import { z } from "zod";

function parseBooleanLike(value: unknown): boolean | unknown {
  if (typeof value !== "string") {
    return value;
  }

  if (value.toLowerCase() === "true") {
    return true;
  }

  if (value.toLowerCase() === "false") {
    return false;
  }

  return value;
}

function parseStringList(value: string | string[]): string[] {
  return Array.isArray(value)
    ? value
    : value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

function emptyStringToUndefined(value: unknown): unknown {
  return value === "" ? undefined : value;
}

const defaultCsrfEnabled = process.env.NODE_ENV === "test" ? "false" : "true";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, { error: "DATABASE_URL is required" }),

  JWT_ACCESS_SECRET: z.string().min(32, { error: "JWT_ACCESS_SECRET must be at least 32 characters" }),
  JWT_REFRESH_SECRET: z.string().min(32, { error: "JWT_REFRESH_SECRET must be at least 32 characters" }),
  JWT_ACCESS_EXPIRY: z.string().regex(/^\d+[smhd]$/, {
    error: "JWT_ACCESS_EXPIRY must be in format: <number><s|m|h|d> (e.g. 15m)",
  }).default("15m"),
  JWT_REFRESH_EXPIRY: z.string().regex(/^\d+[smhd]$/, {
    error: "JWT_REFRESH_EXPIRY must be in format: <number><s|m|h|d> (e.g. 7d)",
  }).default("7d"),

  RESET_PASSWORD_SECRET: z.string().min(32, { error: "RESET_PASSWORD_SECRET must be at least 32 characters" }),
  RESET_PASSWORD_EXPIRY: z.string().regex(/^\d+[smhd]$/, {
    error: "RESET_PASSWORD_EXPIRY must be in format: <number><s|m|h|d> (e.g. 1h)",
  }).default("1h"),

  RESEND_API_KEY: z.string().min(1, { error: "RESEND_API_KEY is required" }),
  RESEND_FROM_EMAIL: z.string().email({ error: "RESEND_FROM_EMAIL must be a valid email" }),

  CLOUDINARY_CLOUD_NAME: z.string().min(1, { error: "CLOUDINARY_CLOUD_NAME is required" }),
  CLOUDINARY_API_KEY: z.string().min(1, { error: "CLOUDINARY_API_KEY is required" }),
  CLOUDINARY_API_SECRET: z.string().min(1, { error: "CLOUDINARY_API_SECRET is required" }),

  CORS_ORIGIN: z
    .string()
    .default("http://localhost:5173")
    .transform((val) =>
      val.includes(",") ? val.split(",").map((s) => s.trim()) : val
    ),

  CSRF_ENABLED: z.preprocess(
    parseBooleanLike,
    z.boolean().default(defaultCsrfEnabled === "true")
  ),
  CSRF_SECRET: z.string().min(32, { error: "CSRF_SECRET must be at least 32 characters" }).default("development-csrf-secret-at-least-32-chars"),
  CSRF_TRUSTED_ORIGINS: z.string().optional(),

  AUTH_COOKIE_SAME_SITE: z
    .enum(["strict", "lax", "none"])
    .default("strict"),
  AUTH_COOKIE_SECURE: z
    .enum(["auto", "true", "false"])
    .default("auto")
    .transform((value) => {
      if (value === "auto") {
        return process.env.NODE_ENV === "production";
      }

      return value === "true";
    }),

  SENTRY_DSN: z.preprocess(
    emptyStringToUndefined,
    z.string().url({ error: "SENTRY_DSN must be a valid URL" }).optional()
  ),
  SENTRY_ENVIRONMENT: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  SENTRY_RELEASE: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    console.error("[ENV] Environment validation failed:\n" + formatted);
    process.exit(1);
  }

  if (
    result.data.NODE_ENV === "production" &&
    result.data.CSRF_ENABLED &&
    !process.env.CSRF_SECRET
  ) {
    console.error(
      "[ENV] Environment validation failed:\n  - CSRF_SECRET: CSRF_SECRET is required when CSRF is enabled in production"
    );
    process.exit(1);
  }

  if (result.data.AUTH_COOKIE_SAME_SITE === "none" && !result.data.AUTH_COOKIE_SECURE) {
    console.error(
      "[ENV] Environment validation failed:\n  - AUTH_COOKIE_SECURE: SameSite=None cookies require AUTH_COOKIE_SECURE=true or production auto mode"
    );
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();

export const csrfTrustedOrigins = env.CSRF_TRUSTED_ORIGINS
  ? parseStringList(env.CSRF_TRUSTED_ORIGINS)
  : parseStringList(env.CORS_ORIGIN);

export type Env = z.infer<typeof envSchema>;
