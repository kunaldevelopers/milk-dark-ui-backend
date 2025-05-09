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
Object.defineProperty(exports, "__esModule", { value: true });
exports.staffRouter = void 0;
const express_1 = require("express");
const staff_1 = require("../controllers/staff");
const auth_1 = require("../middleware/auth");
const StaffSession_1 = require("../models/StaffSession");
const Client_1 = require("../models/Client");
const router = (0, express_1.Router)();
// Helper to wrap async handlers
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
// Apply auth middleware properly using the correct express syntax
router.use(auth_1.authMiddleware);
// Staff lookup routes - these should be first to avoid param conflicts
router.get("/user/:userId", asyncHandler(staff_1.getByUserId));
// Base routes
router.get("/", asyncHandler(staff_1.getAll));
router.post("/", asyncHandler(staff_1.create));
// Staff member specific routes
router.get("/:id", asyncHandler(staff_1.getById));
router.get("/:id/assigned-clients", asyncHandler(staff_1.getAssignedClients));
router.put("/:id", asyncHandler(staff_1.update));
router.delete("/:id", asyncHandler(staff_1.remove));
// Client assignment routes
router.post("/assign", asyncHandler(staff_1.assignClient));
router.post("/unassign", asyncHandler(staff_1.removeAssignment));
// Shift selection routes
router.post("/:id/select-shift", asyncHandler(staff_1.selectShift));
// Fix: Split into two routes instead of using optional parameter
router.get("/:id/session", asyncHandler(staff_1.getSessionByDate)); // For today's session
router.get("/:id/session/:date", asyncHandler(staff_1.getSessionByDate)); // For specific date
// New endpoint for updating assigned clients based on shift
router.post("/:id/update-assigned-clients", asyncHandler(staff_1.updateAssignedClients));
// Daily delivery status routes with shift functionality
router.post("/:id/client/:clientId/daily-delivered", asyncHandler(staff_1.markClientDailyDelivered));
router.post("/:id/client/:clientId/daily-undelivered", asyncHandler(staff_1.markClientDailyUndelivered));
// Legacy delivery status routes (keeping for backward compatibility)
router.post("/client/:id/delivered", asyncHandler(staff_1.markClientDelivered));
router.post("/client/:id/undelivered", asyncHandler(staff_1.markClientUndelivered));
// Select shift endpoint
router.post("/select-shift", asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { shift } = req.body;
        const staffId = req.userId;
        yield StaffSession_1.StaffSession.findOneAndUpdate({
            staffId,
            date: { $gte: new Date().setHours(0, 0, 0, 0) },
        }, { staffId, shift }, { upsert: true });
        res.status(200).json({ message: "Shift selected successfully", shift });
    }
    catch (error) {
        console.error("Error selecting shift:", error);
        res.status(500).json({ message: "Failed to select shift" });
    }
})));
// Get current shift endpoint
router.get("/current-shift", asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const staffId = req.userId;
        const staffSession = yield StaffSession_1.StaffSession.findOne({
            staffId,
            date: { $gte: new Date().setHours(0, 0, 0, 0) },
        });
        res.status(200).json({ shift: (staffSession === null || staffSession === void 0 ? void 0 : staffSession.shift) || null });
    }
    catch (error) {
        console.error("Error fetching current shift:", error);
        res.status(500).json({ message: "Failed to fetch current shift" });
    }
})));
// Get my clients endpoint
router.get("/my-clients", asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const staffId = req.userId;
        const staffSession = yield StaffSession_1.StaffSession.findOne({
            staffId,
            date: { $gte: new Date().setHours(0, 0, 0, 0) },
        });
        if (!staffSession || !staffSession.shift) {
            return res.status(400).json({ message: "Please select a shift first" });
        }
        const clients = yield Client_1.Client.find({
            assignedTo: staffId,
            timeShift: staffSession.shift,
        });
        res.status(200).json(clients);
    }
    catch (error) {
        console.error("Error fetching staff clients:", error);
        res.status(500).json({ message: "Failed to fetch clients" });
    }
})));
// Add new route for getting all staff assignments in one request
router.get("/assignments/all", asyncHandler(staff_1.getAllAssignments));
// New date-based delivery routes
router.get("/:staffId/daily-deliveries", asyncHandler(staff_1.getDailyDeliveries));
router.post("/daily-deliveries", asyncHandler(staff_1.markDailyDelivered));
router.post("/daily-undelivered", asyncHandler(staff_1.markDailyUndelivered));
// Debug endpoint to check if routes are properly registered
router.get("/debug/routes", (req, res) => {
    console.log("[DEBUG] Routes check requested");
    const routes = [];
    const stack = router.stack || [];
    stack.forEach((layer) => {
        if (layer.route) {
            const path = layer.route.path;
            // Use type assertion for internal Express route structure
            const route = layer.route;
            const methods = Object.keys(route.methods || {}).map((m) => m.toUpperCase());
            routes.push({ path, methods });
        }
    });
    res.status(200).json({
        message: "Staff routes debug info",
        routes,
        timestamp: new Date().toISOString(),
    });
});
exports.staffRouter = router;
