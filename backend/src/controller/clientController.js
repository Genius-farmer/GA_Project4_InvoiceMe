import prisma from "../lib/prisma.js";

// PUT /api/clients - create a client owned by the logged-in user
export async function createClient(req, res) {
  try {
    const { companyName, billingAddress, companyEmail } = req.body;

    if (!companyName || !billingAddress || !companyEmail) {
      return res.status(400).json({
        error: "companyName, billingAddress, and companyEmail are required",
      });
    }

    // happy path - take note that userId comes from the token, not the request body
    const client = await prisma.client.create({
      data: {
        companyName,
        billingAddress,
        companyEmail,
        userId: req.user.id,
      },
    });
    return res.status(201).json({ client });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// GET /api/clients - list ONLY the logged-in user's clients
export async function listClients(req, res) {
  try {
    const clients = await prisma.client.findMany({
      where: { userId: req.user.id }, // the authorisation filter
      orderBy: { companyName: "asc" },
    });

    return res.json({ clients });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// GET /api/clients/:id - get a specific client, but only if it's owned by the logged-in user
export async function getClient(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid client id" });
    }

    const client = await prisma.client.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    return res.json({ client });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// PATCH /api/clients/:id - update a specific client, but only if it's owned by the logged-in user
export async function updateClient(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid client id" });
    }

    const { companyName, billingAddress, companyEmail } = req.body;

    if (
      companyName === undefined &&
      billingAddress === undefined &&
      companyEmail === undefined
    ) {
      return res.status(400).json({
        error: "Provide at least one field to update",
      });
    }

    const existing = await prisma.client.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!existing) {
      return res.status(404).json({ error: "Client not found" });
    }

    const data = {};
    if (companyName !== undefined) data.companyName = companyName;
    if (billingAddress !== undefined) data.billingAddress = billingAddress;
    if (companyEmail !== undefined) data.companyEmail = companyEmail;

    const client = await prisma.client.update({ where: { id }, data });

    return res.json({ client });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// DELETE /api/clients/:id - delete a specific client, but only if it's owned by the logged-in user
export async function deleteClient(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid client id" });
    }

    const existing = await prisma.client.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!existing) {
      return res.status(404).json({ error: "Client not found" });
    }

    await prisma.client.delete({ where: { id } });

    return res.json({ message: "Client deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
