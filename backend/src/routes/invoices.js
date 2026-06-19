import { Router } from "express";
import {
  createInvoice,
  listInvoices,
  issueInvoice,
} from "../controller/invoiceController.js";

const router = Router();

router.put("/", createInvoice);
router.get("/", listInvoices);
router.patch("/:id/issue", issueInvoice);

export default router;
