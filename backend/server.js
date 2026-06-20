import "dotenv/config";
import express from "express";

import cors from "cors";
import helmet from "helmet";
import prisma from "./src/lib/prisma.js";

import authRouter from "./src/routes/auth.js";
import clientRouter from "./src/routes/clients.js";
import { requireAuth } from "./src/middleware/auth.js";
import invoiceRouter from "./src/routes/invoices.js";

import dashboardRouter from "./src/routes/dashboard.js";

const app = express();
const PORT = process.env.PORT || 3000; //3000 is backup

app.use(helmet()); //sets safe HTTP headers
app.use(cors()); //let your React app call this API
app.use(express.json()); //parse JSON bodies into JS objects

app.use("/api/auth", authRouter);
app.use("/api/clients", requireAuth, clientRouter);

app.use("/api/invoices", requireAuth, invoiceRouter);

app.use("/api/dashboard", requireAuth, dashboardRouter);

// health check - also indicates the DB connection works end to end
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch (error) {
    res.status(500).json({ status: "error", db: "disconnected" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
