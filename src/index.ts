import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import profileRoutes from "./routes/profile.routes";
import connectionsRoutes from "./routes/connections.routes";
import { errorHandler } from "./middleware/errorHandler";
import usersRouter from "./routes/users.routes";

const app = express();
const PORT = process.env.PORT;

const allowedOrigins = [process.env.F_URL, process.env.LF_URL].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser tools (curl, Postman) that send no Origin header at all
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/auth", authRoutes);
app.use("/", profileRoutes);
app.use("/connections", connectionsRoutes);
app.use("/users", usersRouter);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Central error handler — must be registered last
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});