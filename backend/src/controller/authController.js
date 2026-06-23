import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

// hashing password 2^12 times is a good balance between security and performance
const SALT_ROUNDS = 12;

function issueToken(user) {
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

export async function signUp(req, res) {
  try {
    const { email, password, displayName } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }

    //hashing the password before storing it in the database
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { email, passwordHash, displayName: displayName || null },
    });

    const token = issueToken(user);
    const { passwordHash: _, ...safeUser } = user; // removing the hash from the response
    return res.status(201).json({ user: safeUser, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function signIn(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // verify password FIRST, so that we don't reveal account state to strangers
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // deactivated account can't sign in
    if (!user.isActive) {
      return res.status(403).json({ error: "Account is deactivated" });
    }

    const token = issueToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return res.json({ user: safeUser, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function me(req, res) {
  return res.json({ user: req.user });
}

export async function updateProfile(req, res) {
  try {
    const {
      displayName,
      businessName,
      businessEmail,
      businessAddress,
      phone,
      paymentInstructions,
    } = req.body ?? {};

    // only the fields actually provided in the request will be updated, the rest will be left unchanged
    const data = {};
    if (displayName !== undefined) data.displayName = displayName;
    if (businessName !== undefined) data.businessName = businessName;
    if (businessEmail !== undefined) data.businessEmail = businessEmail;
    if (businessAddress !== undefined) data.businessAddress = businessAddress;
    if (phone !== undefined) data.phone = phone;
    if (paymentInstructions !== undefined)
      data.paymentInstructions = paymentInstructions;

    const user = await prisma.user.update({ where: { id: req.user.id }, data });
    const { passwordHash, ...safeUser } = user;
    return res.json({ user: safeUser });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
