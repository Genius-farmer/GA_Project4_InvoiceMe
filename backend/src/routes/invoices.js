import { Router } from "express";
import {
  createInvoice,
  listInvoices,
  getInvoice,
  issueInvoice,
  payInvoice,
  cancelInvoice,
  updateInvoice,
  deleteInvoice,
} from "../controller/invoiceController.js";

const router = Router();

router.put("/", createInvoice);
router.get("/", listInvoices);
router.get("/:id", getInvoice);
router.patch("/:id/issue", issueInvoice);
router.patch("/:id/pay", payInvoice);
router.patch("/:id/cancel", cancelInvoice);
router.patch("/:id", updateInvoice);
router.delete("/:id", deleteInvoice);

export default router;
