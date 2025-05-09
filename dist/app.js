"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = require("./routes/auth");
const client_1 = require("./routes/client");
const staff_1 = require("./routes/staff");
const admin_1 = require("./routes/admin");
const dailyDeliveries_1 = require("./routes/dailyDeliveries");
const config_1 = require("./config");
const createDummyUsers_1 = require("./scripts/createDummyUsers");
const Settings_1 = require("./models/Settings");
dotenv_1.default.config({ path: './.env' });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    exposedHeaders: ["Authorization", "X-User-Role"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-User-Role"],
}));
app.use(express_1.default.json());
// Log all incoming requests for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, {
        headers: req.headers,
        body: req.body,
    });
    next();
});
// Health check endpoint
app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});
// Routes - Order matters! More specific routes should come first
app.use("/api/admin", admin_1.adminRouter); // Admin routes first
app.use("/api/auth", auth_1.authRouter);
app.use("/api/clients", client_1.clientRouter);
app.use("/api/staff", staff_1.staffRouter);
app.use("/api/daily-deliveries", dailyDeliveries_1.dailyDeliveriesRouter); // Add daily deliveries routes
// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: "Not Found" });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Something broke!" });
});
// Connect to MongoDB and initialize
mongoose_1.default
    .connect(config_1.config.mongoUri)
    .then(() => __awaiter(void 0, void 0, void 0, function* () {
    // Extract database name for logging
    const dbName = config_1.config.mongoUri.split("/").pop();
    console.log(`Connected to MongoDB database: ${dbName}`);
    // Check if connection and db exist
    if (!mongoose_1.default.connection || !mongoose_1.default.connection.db) {
        throw new Error("Database connection not established");
    }
    // Log collections for clarity
    const collections = yield mongoose_1.default.connection.db
        .listCollections()
        .toArray();
    console.log(`Available collections: ${collections.map((c) => c.name).join(", ")}`);
    // Initialize default system settings
    yield (0, Settings_1.initializeDefaultSettings)();
    // Initialize dummy users after successful connection
    try {
        yield (0, createDummyUsers_1.initializeDummyUsers)();
        console.log("✓ Database initialization completed");
    }
    catch (error) {
        console.error("❌ Database initialization failed:", error);
    }
    // Start server after initialization
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}))
    .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
});
