import prisma from "../lib/prisma.js";
import { randomBytes } from "node:crypto";

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
    const { clientId, issueDate, dueDate, taxRate, notes, term, lineItems } =
      req.body;

    // guard: only clientId is required.
    if (!clientId) {
      return res.status(400).json({
        error: "clientId is required",
      });
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
        issueDate: issue,
        dueDate: due,
        subtotal,
        taxRate: Number(taxRate ?? 0),
        notes,
        term,
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
            include: { lineItems: true },
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
