import { Resend } from "resend";
import { env } from "./env.js";

const resend = new Resend(env.RESEND_API_KEY);

export const emailService = {
  /**
   * Send a password-reset email containing a reset link with the token.
   */
  async sendResetPasswordEmail(to: string, resetToken: string): Promise<void> {
    try {
      const resetLink = `${env.CORS_ORIGIN}/reset-password?token=${resetToken}`;

      await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to,
        subject: "UniConnect — Reset Your Password",
        html: `
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your UniConnect account.</p>
          <p>Click the link below to reset your password. This link expires in ${env.RESET_PASSWORD_EXPIRY}.</p>
          <a href="${resetLink}">Reset Password</a>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });
    } catch (error) {
      console.error("Failed to send reset-password email:", error);
    }
  },

  /**
   * Send a temporary password email to a newly created user.
   * (Wired up in Module 2 — Admin user creation)
   */
  async sendTempPasswordEmail(to: string, tempPassword: string): Promise<void> {
    try {
      await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to,
        subject: "UniConnect — Your Account Has Been Created",
        html: `
          <h2>Welcome to UniConnect</h2>
          <p>An account has been created for you.</p>
          <p>Your temporary password is: <strong>${tempPassword}</strong></p>
          <p>Please log in and change your password immediately.</p>
        `,
      });
    } catch (error) {
      console.error("Failed to send temp-password email:", error);
    }
  },
};
