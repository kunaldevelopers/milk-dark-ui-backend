"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const admin_1 = require("../controllers/admin");
const dashboard_1 = require("../controllers/dashboard");
const router = (0, express_1.Router)();
// Admin role middleware
const adminOnly = (req, res, next) => {
    var _a;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin only." });
    }
    next();
};
// Apply auth middleware and admin check to all admin routes
router.use(auth_1.authMiddleware);
router.use(adminOnly);
// Admin management routes
router.get("/admins", admin_1.getAllAdmins);
router.post("/admins", admin_1.addAdmin);
router.delete("/admins/:id", admin_1.deleteAdmin);
router.put("/change-password", admin_1.changePassword);
// Dashboard routes
router.get("/dashboard", dashboard_1.getDashboardData);
router.get("/delivery-history/:clientId", dashboard_1.getDeliveryHistory);
router.get("/delivery-trends", dashboard_1.getDeliveryTrends);
router.get("/non-delivery-reasons", dashboard_1.getNonDeliveryReasons);
// Debug route
router.get("/debug-deliveries", dashboard_1.debugDeliveryData);
exports.adminRouter = router;
