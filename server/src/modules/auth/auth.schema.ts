import { z } from "zod";

// ─── Password Strength Rules ───────────────────────────────────────────────
const passwordSchema = z
  .string()
  .min(8, { error: "Password must be at least 8 characters" })
  .regex(/[a-z]/, { error: "Password must contain a lowercase letter" })
  .regex(/[A-Z]/, { error: "Password must contain an uppercase letter" })
  .regex(/[0-9]/, { error: "Password must contain a number" })
  .regex(/[^a-zA-Z0-9]/, { error: "Password must contain a special character" });

// ─── Login ──────────────────────────────────────────────────────────────────
export const loginSchema = {
  body: z.object({
    email: z.string().email({ error: "Invalid email address" }),
    password: z.string().min(1, { error: "Password is required" }),
  }),
};

// ─── Forgot Password ───────────────────────────────────────────────────────
export const forgotPasswordSchema = {
  body: z.object({
    email: z.string().email({ error: "Invalid email address" }),
  }),
};

// ─── Reset Password ────────────────────────────────────────────────────────
export const resetPasswordSchema = {
  body: z.object({
    token: z.string().min(1, { error: "Reset token is required" }),
    newPassword: passwordSchema,
  }),
};

// ─── Change Password ───────────────────────────────────────────────────────
export const changePasswordSchema = {
  body: z
    .object({
      currentPassword: z.string().min(1, { error: "Current password is required" }),
      newPassword: passwordSchema,
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      error: "New password must be different from current password",
      path: ["newPassword"],
    }),
};
