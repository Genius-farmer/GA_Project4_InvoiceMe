import { Router } from "express";
import { listUsers, setUserActive } from "../controller/adminController.js";

const router = Router();

router.get("/users", listUsers);
router.patch("/users/:id", setUserActive);

export default router;
