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
exports.getDetailedSales = exports.getSalesHistory = exports.getDashboardStats = exports.updateDeliveryStatus = exports.remove = exports.update = exports.create = exports.getById = exports.getAll = void 0;
const Client_1 = require("../models/Client");
const Staff_1 = require("../models/Staff");
const date_fns_1 = require("date-fns");
const getAll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required" });
        }
        let query = {};
        // If user is staff, only return their assigned clients
        if (req.user.role === "staff") {
            const staff = yield Staff_1.Staff.findOne({ userId: req.user.userId });
            if (!staff) {
                return res.status(404).json({ message: "Staff not found" });
            }
            query = { _id: { $in: staff.assignedClients } };
        }
        const clients = yield Client_1.Client.find(query)
            .populate("assignedStaff", "name")
            .lean();
        res.json(clients);
    }
    catch (error) {
        console.error("Error fetching clients:", error);
        res.status(500).json({ message: "Error fetching clients" });
    }
});
exports.getAll = getAll;
const getById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield Client_1.Client.findById(req.params.id);
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }
        res.json(client);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching client" });
    }
});
exports.getById = getById;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Convert number fields to ensure they are numbers
        const pricePerLitre = parseFloat(req.body.pricePerLitre);
        const quantity = parseFloat(req.body.quantity);
        // Validate number fields
        if (isNaN(pricePerLitre) || pricePerLitre <= 0) {
            return res.status(400).json({
                message: "Price per litre must be a valid positive number",
            });
        }
        if (isNaN(quantity) || quantity <= 0) {
            return res.status(400).json({
                message: "Quantity must be a valid positive number",
            });
        }
        // Add current month/year for the billing info
        const now = new Date();
        const clientData = Object.assign(Object.assign({}, req.body), { pricePerLitre,
            quantity, monthlyBilling: {
                month: now.getMonth() + 1,
                year: now.getFullYear(),
                totalQuantity: 0,
                totalAmount: 0,
                isPaid: false,
            }, deliveryStatus: "Pending", deliveryHistory: [] });
        console.log("Creating client with data:", JSON.stringify(clientData));
        const client = new Client_1.Client(clientData);
        yield client.save();
        console.log("Client created successfully:", client._id);
        res.status(201).json(client);
    }
    catch (error) {
        console.error("Error creating client:", error);
        res.status(500).json({
            message: "Error creating client",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.create = create;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Convert and validate number fields
        const pricePerLitre = parseFloat(req.body.pricePerLitre);
        const quantity = parseFloat(req.body.quantity);
        if (isNaN(pricePerLitre) || pricePerLitre <= 0) {
            return res.status(400).json({
                message: "Price per litre must be a valid positive number",
            });
        }
        if (isNaN(quantity) || quantity <= 0) {
            return res.status(400).json({
                message: "Quantity must be a valid positive number",
            });
        }
        const clientData = Object.assign(Object.assign({}, req.body), { pricePerLitre,
            quantity });
        const client = yield Client_1.Client.findByIdAndUpdate(req.params.id, clientData, {
            new: true,
            runValidators: true,
        });
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }
        res.json(client);
    }
    catch (error) {
        console.error("Error updating client:", error);
        res.status(500).json({
            message: "Error updating client",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.update = update;
const remove = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield Client_1.Client.findByIdAndDelete(req.params.id);
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }
        res.json({ message: "Client deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Error deleting client" });
    }
});
exports.remove = remove;
const updateDeliveryStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, reason } = req.body;
        const client = yield Client_1.Client.findById(req.params.id);
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }
        const deliveryRecord = {
            date: new Date(),
            status,
            quantity: client.quantity,
            reason,
        };
        client.deliveryStatus = status;
        client.deliveryHistory.push(deliveryRecord);
        yield client.save();
        res.json(client);
    }
    catch (error) {
        res.status(500).json({ message: "Error updating delivery status" });
    }
});
exports.updateDeliveryStatus = updateDeliveryStatus;
const getDashboardStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const date = req.query.date
            ? new Date(req.query.date)
            : new Date();
        // Get month range for the selected date
        const monthStart = (0, date_fns_1.startOfMonth)(date);
        const monthEnd = (0, date_fns_1.endOfMonth)(date);
        // Get day range for the selected date
        const dayStart = (0, date_fns_1.startOfDay)(date);
        const dayEnd = (0, date_fns_1.endOfDay)(date);
        // Get totals using Promise.all for better performance
        const [totalClients, totalStaff, monthlyDeliveries, dailyDeliveries, todayAssignments,] = yield Promise.all([
            Client_1.Client.countDocuments({}),
            Staff_1.Staff.countDocuments({}),
            // Monthly stats
            Client_1.Client.aggregate([
                {
                    $unwind: "$deliveryHistory",
                },
                {
                    $match: {
                        "deliveryHistory.date": { $gte: monthStart, $lte: monthEnd },
                        "deliveryHistory.status": "Delivered",
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalQuantity: { $sum: "$deliveryHistory.quantity" },
                        totalAmount: {
                            $sum: {
                                $multiply: ["$deliveryHistory.quantity", "$pricePerLitre"],
                            },
                        },
                    },
                },
            ]),
            // Daily stats
            Client_1.Client.aggregate([
                {
                    $unwind: "$deliveryHistory",
                },
                {
                    $match: {
                        "deliveryHistory.date": { $gte: dayStart, $lte: dayEnd },
                        "deliveryHistory.status": "Delivered",
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalQuantity: { $sum: "$deliveryHistory.quantity" },
                        totalAmount: {
                            $sum: {
                                $multiply: ["$deliveryHistory.quantity", "$pricePerLitre"],
                            },
                        },
                    },
                },
            ]),
            // Today's assignments
            Client_1.Client.aggregate([
                {
                    $match: {
                        assignedStaff: { $exists: true, $ne: null },
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalAssignedQuantity: { $sum: "$quantity" },
                    },
                },
            ]),
        ]);
        res.json({
            totalClients,
            totalStaff,
            todayDelivery: ((_a = dailyDeliveries[0]) === null || _a === void 0 ? void 0 : _a.totalQuantity) || 0,
            todayAmount: ((_b = dailyDeliveries[0]) === null || _b === void 0 ? void 0 : _b.totalAmount) || 0,
            monthlyTotal: ((_c = monthlyDeliveries[0]) === null || _c === void 0 ? void 0 : _c.totalQuantity) || 0,
            monthlyAmount: ((_d = monthlyDeliveries[0]) === null || _d === void 0 ? void 0 : _d.totalAmount) || 0,
            assignedQuantity: ((_e = todayAssignments[0]) === null || _e === void 0 ? void 0 : _e.totalAssignedQuantity) || 0,
            date: date,
        });
    }
    catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ message: "Error fetching dashboard statistics" });
    }
});
exports.getDashboardStats = getDashboardStats;
const getSalesHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate } = req.query;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const salesHistory = yield Client_1.Client.aggregate([
            {
                $unwind: "$deliveryHistory",
            },
            {
                $match: {
                    "deliveryHistory.date": { $gte: start, $lte: end },
                    "deliveryHistory.status": "Delivered",
                },
            },
            {
                $group: {
                    _id: {
                        date: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$deliveryHistory.date",
                            },
                        },
                    },
                    totalQuantity: { $sum: "$deliveryHistory.quantity" },
                    totalAmount: {
                        $sum: {
                            $multiply: ["$deliveryHistory.quantity", "$pricePerLitre"],
                        },
                    },
                },
            },
            {
                $sort: { "_id.date": 1 },
            },
        ]);
        res.json(salesHistory);
    }
    catch (error) {
        console.error("Error fetching sales history:", error);
        res.status(500).json({ message: "Error fetching sales history" });
    }
});
exports.getSalesHistory = getSalesHistory;
const getDetailedSales = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate } = req.query;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const detailedSales = yield Client_1.Client.aggregate([
            {
                $match: {
                    "deliveryHistory.date": { $gte: start, $lte: end },
                },
            },
            {
                $unwind: "$deliveryHistory",
            },
            {
                $match: {
                    "deliveryHistory.date": { $gte: start, $lte: end },
                },
            },
            {
                $lookup: {
                    from: "staff",
                    localField: "assignedStaff",
                    foreignField: "_id",
                    as: "staffInfo",
                },
            },
            {
                $unwind: {
                    path: "$staffInfo",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    clientName: "$name",
                    contactNumber: "$number",
                    timeShift: 1,
                    quantity: "$deliveryHistory.quantity",
                    amount: {
                        $multiply: ["$deliveryHistory.quantity", "$pricePerLitre"],
                    },
                    deliveryStatus: "$deliveryHistory.status",
                    staffName: { $ifNull: ["$staffInfo.name", "Unassigned"] },
                },
            },
            {
                $sort: {
                    "deliveryHistory.date": 1,
                    clientName: 1,
                },
            },
        ]);
        res.json(detailedSales);
    }
    catch (error) {
        console.error("Error fetching detailed sales:", error);
        res.status(500).json({ message: "Error fetching detailed sales data" });
    }
});
exports.getDetailedSales = getDetailedSales;
