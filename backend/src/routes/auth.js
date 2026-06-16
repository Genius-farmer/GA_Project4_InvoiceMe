import { Router } from "express";
import { signUp, signIn, me } from "../controller/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.put("/sign-up", signUp);
router.post("/sign-in", signIn);
router.get("/me", requireAuth, me);

export default router;
