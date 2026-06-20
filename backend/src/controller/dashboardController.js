import prisma from "../lib/prisma.js";

const round2 = (n) => Math.round(n * 100) / 100; // round up money to 2dp

// GET /api/dashboard - billed vs collected vs outstanding, grouped by invoice issue-month
export async function getDashboard(req, res) {
  try {
    // only REAL invoices count: issued (unpaid) + paid. drafts and cancelled invoices are excluded
    const invoices = await prisma.invoice.findMany({
      where: { userId: req.user.id, status: { in: ["issued", "paid"] } },
      select: { issueDate: true, subtotal: true, status: true },
    });

    const months = {}; // "YYYY-MM" --> running totals
    for (const inv of invoices) {
      const month = inv.issueDate.toISOString().slice(0, 7); // "2026-06"
      const amount = Number(inv.subtotal); // Decimal -> number AT THE BOUNDARY

      months[month] ??= { month, billed: 0, collected: 0, invoiceCount: 0 };
      months[month].billed += amount;
      if (inv.status === "paid") months[month].collected += amount;
      months[month].invoiceCount += 1;
    }

    const byMonth = Object.values(months)
      .sort((a, b) => a.month.localeCompare(b.month)) // chronological
      .map((m) => ({
        month: m.month,
        billed: round2(m.billed),
        collected: round2(m.collected),
        outstanding: round2(m.billed - m.collected),
        invoiceCount: m.invoiceCount,
      }));

    const totals = byMonth.reduce(
      (acc, m) => ({
        billed: round2(acc.billed + m.billed),
        collected: round2(acc.collected + m.collected),
        outstanding: round2(acc.outstanding + m.outstanding),
      }),
      { billed: 0, collected: 0, outstanding: 0 },
    );
    return res.json({ totals, byMonth });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
