import express from "express";
import authRoutes from "./features/auth/auth.routes";
import adminRoutes from "./features/admin/admin.routes";

const app = express();

// Parse JSON body
app.use(express.json());

// Health check — verify server is alive
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

export default app;
