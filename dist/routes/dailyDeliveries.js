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
exports.dailyDeliveriesRouter = void 0;
const express_1 = require("express");
const DailyDelivery_1 = require("../models/DailyDelivery");
const StaffSession_1 = require("../models/StaffSession");
const auth_1 = require("../middleware/auth");
const Client_1 = require("../models/Client");
const Staff_1 = require("../models/Staff");
const mongoose_1 = __importDefault(require("mongoose"));
const router = (0, express_1.Router)();
// Helper to wrap async handlers
const asyncHandler = (fn) => {
    return (req, res, next) => {
        return Promise.resolve(fn(req, res, next)).catch(next);
    };
};
// Apply auth middleware to all routes
// Fix: Create a wrapper function that TypeScript can recognize as a proper middleware
router.use((req, res, next) => {
    (0, auth_1.authMiddleware)(req, res, next);
});
// Get all deliveries for a specific date, optionally filtered by shift
router.get("/:date", asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dateParam = req.params.date;
        const { shift } = req.query;
        // Parse the date, defaulting to today if invalid
        let date;
        try {
            date = new Date(dateParam);
            // Check if the date is valid
            if (isNaN(date.getTime())) {
                throw new Error("Invalid date");
            }
        }
        catch (_a) {
            date = new Date();
        }
        // Set time to midnight for consistent comparison
        date.setHours(0, 0, 0, 0);
        // Build the query
        const query = { date };
        if (shift && ["AM", "PM"].includes(shift)) {
            query.shift = shift;
        }
        // Fetch the deliveries with populated client and staff data
        const dailyDeliveries = yield DailyDelivery_1.DailyDelivery.find(query)
            .populate({
            path: "clientId",
            select: "name number location timeShift quantity pricePerLitre",
        })
            .populate({
            path: "staffId",
            select: "name shift contactNumber",
        });
        console.log(`Fetched ${dailyDeliveries.length} deliveries for ${date.toISOString().split("T")[0]}${shift ? `, shift: ${shift}` : ""}`);
        res.json(dailyDeliveries);
    }
    catch (error) {
        console.error("Error fetching daily deliveries:", error);
        res.status(500).json({
            message: "Error fetching daily deliveries",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
})));
// Get staff's deliveries for a specific date, filtered by their selected shift
router.get("/staff/:staffId/:date", asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { staffId, date: dateParam } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(staffId)) {
            return res.status(400).json({ message: "Invalid staff ID format" });
        }
        // Parse the date, defaulting to today if invalid
        let date;
        try {
            date = new Date(dateParam);
            // Check if the date is valid
            if (isNaN(date.getTime())) {
                throw new Error("Invalid date");
            }
        }
        catch (_a) {
            date = new Date();
        }
        // Set time to midnight for consistent comparison
        date.setHours(0, 0, 0, 0);
        // Get the staff's selected shift for this date
        const staffSession = yield StaffSession_1.StaffSession.findOne({ staffId, date });
        // Get staff member record
        const staffMember = yield Staff_1.Staff.findById(staffId).populate({
            path: "assignedClients",
            match: { timeShift: { $exists: true } },
            select: "name number location timeShift quantity pricePerLitre deliveryStatus deliveryNotes",
        });
        if (!staffMember) {
            return res.status(404).json({ message: "Staff not found" });
        }
        // If no shift selected, return available shifts with their clients
        if (!staffSession) {
            const clientsByShift = {
                AM: staffMember.assignedClients.filter((client) => client.timeShift === "AM"),
                PM: staffMember.assignedClients.filter((client) => client.timeShift === "PM"),
            };
            return res.status(400).json({
                message: "No shift selected for this date",
                clientsByShift,
                requireShiftSelection: true,
            });
        }
        // Find clients that match the staff's selected shift
        const clients = yield Client_1.Client.find({
            _id: { $in: staffMember.assignedClients },
            timeShift: staffSession.shift,
        });
        // Find or create delivery records for each client
        const deliveries = yield Promise.all(clients.map((client) => __awaiter(void 0, void 0, void 0, function* () {
            let delivery = yield DailyDelivery_1.DailyDelivery.findOne({
                clientId: client._id,
                staffId,
                date,
                shift: staffSession.shift,
            });
            if (!delivery) {
                delivery = new DailyDelivery_1.DailyDelivery({
                    clientId: client._id,
                    staffId,
                    date,
                    shift: staffSession.shift,
                    deliveryStatus: client.deliveryStatus || "Pending",
                    quantity: 0,
                    price: 0,
                });
                yield delivery.save();
            }
            return {
                _id: delivery._id,
                clientId: client,
                staffId,
                date,
                shift: staffSession.shift,
                deliveryStatus: delivery.deliveryStatus,
                quantity: delivery.quantity,
                price: delivery.price,
            };
        })));
        res.json({
            shift: staffSession.shift,
            deliveries,
        });
    }
    catch (error) {
        console.error("Error fetching daily deliveries:", error);
        res.status(500).json({
            message: "Error fetching daily deliveries",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
})));
// Generate daily delivery statistics
router.get("/stats/:date", asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dateParam = req.params.date;
        const { shift } = req.query;
        // Parse the date, defaulting to today if invalid
        let date;
        try {
            date = new Date(dateParam);
            // Check if the date is valid
            if (isNaN(date.getTime())) {
                throw new Error("Invalid date");
            }
        }
        catch (_a) {
            date = new Date();
        }
        // Set time to midnight for consistent comparison
        date.setHours(0, 0, 0, 0);
        // Build the query
        const query = { date };
        if (shift && ["AM", "PM"].includes(shift)) {
            query.shift = shift;
        }
        // Get total deliveries and statistics
        const [deliveries, totalDelivered, totalNotDelivered] = yield Promise.all([
            DailyDelivery_1.DailyDelivery.find(query),
            DailyDelivery_1.DailyDelivery.countDocuments(Object.assign(Object.assign({}, query), { deliveryStatus: "Delivered" })),
            DailyDelivery_1.DailyDelivery.countDocuments(Object.assign(Object.assign({}, query), { deliveryStatus: "Not Delivered" })),
        ]);
        // Calculate quantities and revenue
        const totalQuantity = deliveries.reduce((sum, delivery) => sum + delivery.quantity, 0);
        const totalRevenue = deliveries.reduce((sum, delivery) => sum + delivery.price, 0);
        const stats = {
            date: date.toISOString().split("T")[0],
            shift: shift || "All",
            totalDeliveries: deliveries.length,
            totalDelivered,
            totalNotDelivered,
            totalQuantity,
            totalRevenue,
            deliveryPercentage: deliveries.length
                ? (totalDelivered / deliveries.length) * 100
                : 0,
        };
        console.log(`Generated stats for ${date.toISOString().split("T")[0]}${shift ? `, shift: ${shift}` : ""}`);
        res.json(stats);
    }
    catch (error) {
        console.error("Error generating daily delivery stats:", error);
        res.status(500).json({
            message: "Error generating statistics",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
})));
exports.dailyDeliveriesRouter = router;
// Step 3 implemented: Created daily deliveries routes with shift and date filtering
