import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authenticate } from "../../middleware/authenticate.js";
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "./auth.schema.js";
import {
  handleLogin,
  handleLogout,
  handleRefresh,
  handleForgotPassword,
  handleResetPassword,
  handleChangePassword,
} from "./auth.controller.js";

const router = Router();

router.post("/login", validate(loginSchema), handleLogin);
router.post("/logout", authenticate, handleLogout);
router.post("/refresh", handleRefresh);
router.post("/forgot-password", validate(forgotPasswordSchema), handleForgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), handleResetPassword);
router.patch("/change-password", authenticate, validate(changePasswordSchema), handleChangePassword);

export default router;
