"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
const connections_routes_1 = __importDefault(require("./routes/connections.routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
app.use((0, cors_1.default)({
    origin: "*",
    credentials: true,
}));
app.use(express_1.default.json());
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/auth", auth_routes_1.default);
app.use("/", profile_routes_1.default); // exposes /profile, /users/:id, /users/search
app.use("/connections", connections_routes_1.default);
// 404 fallback
app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});
// Central error handler — must be registered last
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
});
