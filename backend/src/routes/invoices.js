import { Router } from "express";
import {
  createInvoice,
  listInvoices,
  issueInvoice,
  payInvoice,
  cancelInvoice,
} from "../controller/invoiceController.js";

const router = Router();

router.put("/", createInvoice);
router.get("/", listInvoices);
router.patch("/:id/issue", issueInvoice);
router.patch("/:id/pay", payInvoice);
router.patch("/:id/cancel", cancelInvoice);

export default router;
