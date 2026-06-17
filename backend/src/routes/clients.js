import { Router } from "express";
import {
  createClient,
  listClients,
  getClient,
  updateClient,
  deleteClient,
} from "../controller/clientController.js";

const router = Router();

router.put("/", createClient);
router.get("/", listClients);
router.get("/:id", getClient);
router.patch("/:id", updateClient);
router.delete("/:id", deleteClient);

export default router;
