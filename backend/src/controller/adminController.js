import prisma from "../lib/prisma.js";

const SAFE_FIELDS = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  isActive: true,
};

// GET /api/admin/users - list everyone
export async function listUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { id: "asc" },
      select: SAFE_FIELDS,
    });
    return res.json({ users });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// PATCH /api/admin/users/:id - ban or unban (toggle isActive)
export async function setUserActive(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const { isActive } = req.body ?? {};
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ error: "isActive (boolean) is required" });
    }

    // an admin can't ban themselves
    if (id === req.user.id) {
      return res
        .status(400)
        .json({ error: "You can't change your own status" });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: SAFE_FIELDS,
    });
    return res.json({ user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
