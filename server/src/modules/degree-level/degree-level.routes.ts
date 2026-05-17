import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { handleListDegreeLevels } from "./degree-level.controller.js";

const router = Router();

router.get("/", authenticate, handleListDegreeLevels);

export default router;
