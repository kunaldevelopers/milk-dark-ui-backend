"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientRouter = void 0;
const express_1 = require("express");
const client_1 = require("../controllers/client");
const dashboard_1 = require("../controllers/dashboard");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// Existing routes
router.get("/", client_1.getAll);
router.get("/:id", client_1.getById);
router.post("/", client_1.create);
router.put("/:id", client_1.update);
router.delete("/:id", client_1.remove);
router.put("/:id/delivery-status", client_1.updateDeliveryStatus);
// New dashboard routes
router.get("/stats/dashboard", client_1.getDashboardStats);
router.get("/stats/sales-history", client_1.getSalesHistory);
router.get("/stats/detailed-sales", client_1.getDetailedSales);
router.get("/stats/debug", dashboard_1.debugDeliveryData);
exports.clientRouter = router;
