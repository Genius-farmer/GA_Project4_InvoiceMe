import prisma from "../lib/prisma.js";
import { randomBytes } from "node:crypto";

function profileSnapshot(user) {
  return {
    businessName: user.businessName ?? null,
    businessEmail: user.businessEmail ?? null,
    businessAddress: user.businessAddress ?? null,
    phone: user.phone ?? null,
    paymentInstructions: user.paymentInstructions ?? null,
  };
}

// opaque, non-sequential public code, example: "INV-A7K9Q2X3"
function generateInvoiceNumber() {
  return `INV-${randomBytes(4).toString("hex").toUpperCase()}`;
}

const TRANSITIONS = {
  draft: ["issued"], // issuing assigns the numbers
  issued: ["paid", "cancelled"], // can be paid, or voided
  paid: [], // terminal — corrections via credit note
  cancelled: [], // terminal
};

// PUT /api/invoices - create an invoice (with its line item) for the logged-in user
export async function createInvoice(req, res) {
  try {
    const {
      clientId,
      invoiceName,
      issueDate,
      dueDate,
      taxRate,
      notes,
      term,
      lineItems,
      billFrom,
    } = req.body ?? {}; // all optional - the invoice starts as a flexible draft that can be completed later

    // guard: only clientId is required.
    if (!clientId) {
      if (!invoiceName || !invoiceName.trim()) {
        return res.status(400).json({ error: "Invoice name is required" });
      }
    }

    // guard: the client must exist AND belong to the logged-in user
    const client = await prisma.client.findFirst({
      where: { id: Number(clientId), userId: req.user.id },
    });
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // line items are optional AND may be partial in a draft - no completeness check here.
    const items = Array.isArray(lineItems) ? lineItems : [];

    // subtotal treats any missing amount as 0; it's recomputed properly at issue
    const subtotal = items.reduce(
      (sum, item) =>
        sum + Number(item.quantity ?? 0) * Number(item.unitCost ?? 0),
      0,
    );

    const issue = issueDate ? new Date(issueDate) : new Date();
    let due;
    if (dueDate) {
      due = new Date(dueDate);
    } else {
      due = new Date(issue);
      due.setDate(due.getDate() + 30);
    }

    // one atomic nested write: invoice + its line items together
    const invoice = await prisma.invoice.create({
      data: {
        userId: req.user.id,
        clientId: Number(clientId),
        invoiceName: invoiceName.trim(),
        issueDate: issue,
        dueDate: due,
        subtotal,
        taxRate: Number(taxRate ?? 0),
        notes,
        term,
        billFrom: billFrom ?? profileSnapshot(req.user), // default to user's current profile snapshot, but allow overriding at creation time
        lineItems: {
          create: items.map((item) => ({
            gigRole: item.gigRole ?? null,
            gigDescription: item.gigDescription ?? null,
            quantity: item.quantity != null ? Number(item.quantity) : null,
            unitCost: item.unitCost != null ? Number(item.unitCost) : null,
          })),
        },
      },
      include: { lineItems: true }, // send the created items back in response
    });

    return res.status(201).json({ invoice });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// GET /api/invoices - list the logged-in user's invoices
export async function listInvoices(req, res) {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { userId: req.user.id },
      orderBy: { issueDate: "desc" },
      include: { client: true }, // so a list view can show the client name
    });
    return res.json({ invoices });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// GET /api/invoices/:id - get specific invoice details, with its client & line items
export async function getInvoice(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid invoice id" });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: req.user.id }, //ownership guard
      include: { client: true, lineItems: true }, //everything the details/print view needs
    });
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    return res.json({ invoice });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function issueInvoice(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid invoice id" });
    }

    // ownership + load the line items so we can validate them
    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: req.user.id },
      include: { lineItems: true },
    });
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // guard: the transition must be legal (only a draft can be issued)
    if (!TRANSITIONS[invoice.status].includes("issued")) {
      return res
        .status(409)
        .json({ error: `Cannot issue an invoice that is '${invoice.status}'` });
    }

    // guard: completeness - This is the strict gate drafts were exempt from
    if (invoice.lineItems.length === 0) {
      return res
        .status(400)
        .json({ error: "Cannot issue an invoice with no line items" });
    }
    for (const item of invoice.lineItems) {
      if (
        !item.gigRole ||
        !item.gigDescription ||
        item.quantity == null ||
        Number(item.quantity) <= 0 ||
        item.unitCost == null ||
        Number(item.unitCost) < 0
      ) {
        return res.status(400).json({
          error:
            "Every line item needs a role, description, quantity >0, and unit cost before issuing",
        });
      }
    }

    // guard: the bill-from snapshot must identify you + how to pay
    const bf = invoice.billFrom || {};
    if (!bf.businessName || !bf.businessEmail || !bf.paymentInstructions) {
      return res.status(400).json({
        error:
          "Set your business name, business email, and payment instructions in the Settings before issuing.",
      });
    }

    // recompute the subtotal from the now-complete line items
    const subtotal = invoice.lineItems.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unitCost),
      0,
    );

    // assign numbers atomically; retry if the random public number happens to collide (unlikely with 8 random hex chars, but good to be safe)
    let issued;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        issued = await prisma.$transaction(async (tx) => {
          // bump the user's private counter -> that's this invoice's seq
          const user = await tx.user.update({
            where: { id: req.user.id },
            data: { invoiceCounter: { increment: 1 } },
            select: { invoiceCounter: true },
          });
          return tx.invoice.update({
            where: { id },
            data: {
              invoiceSeq: user.invoiceCounter,
              invoiceNumber: generateInvoiceNumber(),
              status: "issued",
              subtotal,
            },
            include: { client: true, lineItems: true },
          });
        });
        break; // success, exit the retry loop
      } catch (e) {
        if (e.code === "P2002" && attempt < 4) continue; // number collision - regenerate & retry
        throw e;
      }
    }

    return res.json({ invoice: issued });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function payInvoice(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid invoice id" });
    }

    const { paidAt } = req.body ?? {}; // optional - the date the money actually reaches user's account

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // an issued invoice can be paid; an already-paid one can have its date corrected
    if (invoice.status !== "issued" && invoice.status !== "paid") {
      return res.status(409).json({
        error: `Cannot set a paid date on a '${invoice.status}' invoice`,
      });
    }

    const paid = await prisma.invoice.update({
      where: { id },
      data: {
        status: "paid",
        paidAt: paidAt ? new Date(paidAt) : new Date(), //default to today if not provided
      },
      include: { client: true, lineItems: true },
    });

    return res.json({ invoice: paid });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// PATCH /api/invoices/:id/cancel- void an issued invoice but keep its number
export async function cancelInvoice(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid invoice id" });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // guard: only an issued invoice can be cancelled
    if (!TRANSITIONS[invoice.status].includes("cancelled")) {
      return res.status(409).json({
        error: `Cannot cancel an invoice that is '${invoice.status}'`,
      });
    }

    const cancelled = await prisma.invoice.update({
      where: { id },
      data: { status: "cancelled" },
      include: { client: true, lineItems: true },
    });

    return res.json({ invoice: cancelled });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// PATCH /api/invoices/:id - edit invoice content (blocked once paid or cancelled)
export async function updateInvoice(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid invoice id" });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    //guard: only a live invoice (draft or issued) can be edited
    if (invoice.status === "paid" || invoice.status === "cancelled") {
      return res
        .status(409)
        .json({ error: `A '${invoice.status}' invoice cannot be edited` });
    }

    const {
      clientId,
      invoiceName,
      issueDate,
      dueDate,
      taxRate,
      notes,
      term,
      lineItems,
      billFrom,
    } = req.body ?? {};

    // build a partial update - only the fields that were actually sent
    const data = {};

    if (clientId !== undefined) {
      // if changing client, it must still be one you own
      const client = await prisma.client.findFirst({
        where: { id: Number(clientId), userId: req.user.id },
      });
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      data.clientId = Number(clientId);
    }
    if (invoiceName !== undefined) {
      if (!invoiceName.trim()) {
        return res.status(400).json({ error: "Invoice name cannot be empty" });
      }
      data.invoiceName = invoiceName.trim();
    }

    if (issueDate !== undefined) data.issueDate = new Date(issueDate);
    if (dueDate !== undefined) data.dueDate = new Date(dueDate);
    if (taxRate !== undefined) data.taxRate = Number(taxRate);
    if (notes !== undefined) data.notes = notes;
    if (term !== undefined) data.term = term;
    if (billFrom !== undefined) data.billFrom = billFrom;

    // if line items are provided, replace the whole set and recompute the subtotal
    if (lineItems !== undefined) {
      const items = Array.isArray(lineItems) ? lineItems : [];
      data.subtotal = items.reduce(
        (sum, item) =>
          sum + Number(item.quantity ?? 0) * Number(item.unitCost ?? 0),
        0,
      );
      data.lineItems = {
        deleteMany: {}, // delete existing items - we have to do this before creating the new ones in the same transaction
        create: items.map((item) => ({
          gigRole: item.gigRole ?? null,
          gigDescription: item.gigDescription ?? null,
          quantity: item.quantity != null ? Number(item.quantity) : null,
          unitCost: item.unitCost != null ? Number(item.unitCost) : null,
        })),
      };
    }

    // guard: must change at least one field
    if (Object.keys(data).length === 0) {
      return res
        .status(400)
        .json({ error: "Provide at least one field to update" });
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data,
      include: { client: true, lineItems: true },
    });

    return res.json({ invoice: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// DELETE /api/invoices/:id - delete a DRAFT
export async function deleteInvoice(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid invoice id" });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // guard: only drafts can be deleted;
    if (invoice.status !== "draft") {
      return res.status(409).json({
        error: `Only drafts can be deleted - cancel (void) a '${invoice.status}' invoice instead`,
      });
    }

    await prisma.invoice.delete({ where: { id } });

    return res.json({ message: "Draft invoice deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
