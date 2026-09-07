import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import profileRoutes from "./routes/profile.routes";
import connectionsRoutes from "./routes/connections.routes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT;

app.use(
  cors({
    origin: (origin, callback) => callback(null, true), 
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/auth", authRoutes);
app.use("/", profileRoutes);
app.use("/connections", connectionsRoutes);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Central error handler — must be registered last
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});