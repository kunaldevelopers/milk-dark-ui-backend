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
exports.debugDeliveryData = exports.getNonDeliveryReasons = exports.getDeliveryTrends = exports.getDeliveryHistory = exports.getDashboardData = void 0;
const Client_1 = require("../models/Client");
const Staff_1 = require("../models/Staff");
const DailyDelivery_1 = require("../models/DailyDelivery");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Get comprehensive dashboard data with accurate metrics
 */
const getDashboardData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Parse date from query or use today
        let queryDate = new Date();
        if (req.query.date) {
            queryDate = new Date(req.query.date);
        }
        // Create date range for the full day in UTC
        const dateString = queryDate.toISOString().split("T")[0]; // YYYY-MM-DD
        const startDate = new Date(dateString);
        const endDate = new Date(dateString);
        endDate.setHours(23, 59, 59, 999);
        console.log(`[DASHBOARD] Querying deliveries for date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        // Get shift filter if provided
        const shiftFilter = req.query.shift;
        // Get counts
        const totalClients = yield Client_1.Client.countDocuments();
        const totalStaff = yield Staff_1.Staff.countDocuments();
        // Get today's and monthly totals with proper date handling
        const todaysTotals = yield getTodaysDeliveryTotal(startDate, endDate);
        const monthlyTotals = yield getMonthlyDeliveryTotal(queryDate);
        // Get success rate for today
        const deliverySuccessRate = yield getDeliverySuccessRate(startDate, endDate);
        // Get assigned milk quantity
        const totalAssignedQuantity = yield Client_1.Client.aggregate([
            { $group: { _id: null, totalQuantity: { $sum: "$quantity" } } },
        ]);
        const assignedQuantity = totalAssignedQuantity.length > 0
            ? totalAssignedQuantity[0].totalQuantity
            : 0;
        // Get today's delivery records with shift filtering
        const deliveryRecords = yield getTodaysDeliveryRecords(startDate, endDate, shiftFilter);
        // Get staff performance
        const staffPerformance = yield getStaffPerformance(startDate, endDate);
        // Get shift analytics
        const shiftAnalytics = yield getShiftAnalytics(startDate, endDate);
        // Get priority clients
        const priorityClients = yield getPriorityClientsData(startDate, endDate, shiftFilter);
        // Send dashboard data
        res.json({
            counts: {
                totalClients,
                totalStaff,
            },
            today: {
                date: queryDate.toISOString(),
                quantity: todaysTotals.quantity,
                revenue: todaysTotals.revenue,
                successRate: deliverySuccessRate.successRate,
            },
            monthly: {
                quantity: monthlyTotals.quantity,
                revenue: monthlyTotals.revenue,
            },
            deliverySummary: {
                totalDeliveries: deliverySuccessRate.total,
                delivered: deliverySuccessRate.delivered,
                successRate: deliverySuccessRate.successRate,
                totalQuantity: todaysTotals.quantity,
                totalRevenue: todaysTotals.revenue,
            },
            assignmentStatus: {
                totalQuantityAssigned: assignedQuantity,
            },
            priorityClients,
            deliveryRecords,
            staffPerformance,
            shiftAnalytics,
        });
    }
    catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({
            message: "Error retrieving dashboard data",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.getDashboardData = getDashboardData;
/**
 * Get today's total delivery quantity and revenue
 */
const getTodaysDeliveryTotal = (startDate, endDate) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`[DASHBOARD] Getting today's totals for ${startDate.toISOString()} to ${endDate.toISOString()}`);
    // Ensure dates are set to midnight for consistent comparison
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    const result = yield DailyDelivery_1.DailyDelivery.aggregate([
        {
            $match: {
                date: {
                    $gte: startDate,
                    $lte: endDate,
                },
                deliveryStatus: "Delivered",
            },
        },
        {
            $group: {
                _id: null,
                totalQuantity: { $sum: "$quantity" },
                totalRevenue: { $sum: "$price" },
            },
        },
    ]);
    const returnValue = result.length > 0
        ? { quantity: result[0].totalQuantity, revenue: result[0].totalRevenue }
        : { quantity: 0, revenue: 0 };
    console.log(`[DASHBOARD] Today's totals: ${JSON.stringify(returnValue)}`);
    return returnValue;
});
/**
 * Get monthly total delivery quantity and revenue
 */
const getMonthlyDeliveryTotal = (date) => __awaiter(void 0, void 0, void 0, function* () {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    // Create date range for the current month
    const firstDayStr = `${year}-${month.toString().padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0); // Last day of current month
    const lastDayStr = `${year}-${month
        .toString()
        .padStart(2, "0")}-${lastDay.getDate()}`;
    const firstDay = new Date(firstDayStr);
    firstDay.setHours(0, 0, 0, 0);
    lastDay.setHours(23, 59, 59, 999);
    console.log(`[DASHBOARD] Querying monthly deliveries: ${firstDay.toISOString()} to ${lastDay.toISOString()}`);
    const result = yield DailyDelivery_1.DailyDelivery.aggregate([
        {
            $match: {
                date: {
                    $gte: firstDay,
                    $lte: lastDay,
                },
                deliveryStatus: "Delivered",
            },
        },
        {
            $group: {
                _id: null,
                totalQuantity: { $sum: "$quantity" },
                totalRevenue: { $sum: "$price" },
            },
        },
    ]);
    const returnValue = result.length > 0
        ? {
            quantity: result[0].totalQuantity || 0,
            revenue: result[0].totalRevenue || 0,
        }
        : { quantity: 0, revenue: 0 };
    console.log(`[DASHBOARD] Monthly totals: ${JSON.stringify(returnValue)}`);
    return returnValue;
});
/**
 * Get delivery success rate
 */
const getDeliverySuccessRate = (startDate, endDate) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`[DASHBOARD] Querying success rate between ${startDate.toISOString()} and ${endDate.toISOString()}`);
    // Set consistent times for date comparison
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    const aggregateResult = yield DailyDelivery_1.DailyDelivery.aggregate([
        {
            $match: {
                date: { $gte: startDate, $lte: endDate },
            },
        },
        {
            $group: {
                _id: null,
                totalDeliveries: { $sum: 1 },
                delivered: {
                    $sum: {
                        $cond: [{ $eq: ["$deliveryStatus", "Delivered"] }, 1, 0],
                    },
                },
            },
        },
    ]);
    const result = aggregateResult.length > 0
        ? {
            total: aggregateResult[0].totalDeliveries,
            delivered: aggregateResult[0].delivered,
            successRate: aggregateResult[0].totalDeliveries > 0
                ? (aggregateResult[0].delivered /
                    aggregateResult[0].totalDeliveries) *
                    100
                : 0,
        }
        : {
            total: 0,
            delivered: 0,
            successRate: 0,
        };
    console.log(`[DASHBOARD] Success rate results: ${JSON.stringify(result)}`);
    return result;
});
/**
 * Get staff performance by delivery success rate
 */
const getStaffPerformance = (startDate, endDate) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`[DASHBOARD] Querying staff performance between ${startDate.toISOString()} and ${endDate.toISOString()}`);
    const staffPerformance = yield DailyDelivery_1.DailyDelivery.aggregate([
        {
            $match: {
                date: { $gte: startDate, $lte: endDate },
            },
        },
        {
            $group: {
                _id: "$staffId",
                deliveredCount: {
                    $sum: {
                        $cond: [{ $eq: ["$deliveryStatus", "Delivered"] }, 1, 0],
                    },
                },
                notDeliveredCount: {
                    $sum: {
                        $cond: [{ $eq: ["$deliveryStatus", "Not Delivered"] }, 1, 0],
                    },
                },
                totalQuantity: { $sum: "$quantity" },
                totalRevenue: { $sum: "$price" },
            },
        },
        {
            $lookup: {
                from: "staffs",
                localField: "_id",
                foreignField: "_id",
                as: "staffInfo",
            },
        },
        {
            $unwind: {
                path: "$staffInfo",
                preserveNullAndEmptyArrays: true, // Keep staff entries even if no matching info
            },
        },
        {
            $project: {
                staffName: { $ifNull: ["$staffInfo.name", "Unknown Staff"] },
                deliveredCount: 1,
                notDeliveredCount: 1,
                totalQuantity: 1,
                totalRevenue: 1,
                successRate: {
                    $multiply: [
                        {
                            $cond: [
                                {
                                    $eq: [{ $add: ["$deliveredCount", "$notDeliveredCount"] }, 0],
                                },
                                0,
                                {
                                    $divide: [
                                        "$deliveredCount",
                                        { $add: ["$deliveredCount", "$notDeliveredCount"] },
                                    ],
                                },
                            ],
                        },
                        100,
                    ],
                },
            },
        },
    ]);
    console.log(`[DASHBOARD] Found ${staffPerformance.length} staff performance records`);
    return staffPerformance;
});
/**
 * Get shift-based analytics
 */
const getShiftAnalytics = (startDate, endDate) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`[DASHBOARD] Querying shift analytics between ${startDate.toISOString()} and ${endDate.toISOString()}`);
    const shiftAnalytics = yield DailyDelivery_1.DailyDelivery.aggregate([
        { $match: { date: { $gte: startDate, $lte: endDate } } },
        {
            $group: {
                _id: "$shift",
                deliveryCount: { $sum: 1 },
                deliveredCount: {
                    $sum: {
                        $cond: [{ $eq: ["$deliveryStatus", "Delivered"] }, 1, 0],
                    },
                },
                totalQuantity: { $sum: "$quantity" },
                totalRevenue: { $sum: "$price" },
            },
        },
        {
            $project: {
                shift: "$_id",
                deliveryCount: 1,
                deliveredCount: 1,
                successRate: {
                    $multiply: [
                        {
                            $cond: [
                                { $eq: ["$deliveryCount", 0] },
                                0,
                                { $divide: ["$deliveredCount", "$deliveryCount"] },
                            ],
                        },
                        100,
                    ],
                },
                totalQuantity: 1,
                totalRevenue: 1,
                _id: 0,
            },
        },
    ]);
    console.log(`[DASHBOARD] Found ${shiftAnalytics.length} shift analytics records`);
    if (shiftAnalytics.length > 0) {
        console.log(`[DASHBOARD] Shift analytics sample: ${JSON.stringify(shiftAnalytics[0])}`);
    }
    return shiftAnalytics;
});
/**
 * Get client delivery history
 */
const getDeliveryHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { clientId } = req.params;
        const { startDate, endDate } = req.query;
        // Validate client ID
        if (!mongoose_1.default.Types.ObjectId.isValid(clientId)) {
            return res.status(400).json({ message: "Invalid client ID format" });
        }
        // Create date range filter
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter = {};
            if (startDate)
                dateFilter.$gte = new Date(startDate);
            if (endDate)
                dateFilter.$lte = new Date(endDate);
        }
        // Query for delivery records
        const deliveryHistory = yield DailyDelivery_1.DailyDelivery.find(Object.assign({ clientId }, (Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})))
            .sort({ date: -1 })
            .populate("staffId", "name");
        // Also get the client details including their embedded delivery history
        const client = yield Client_1.Client.findById(clientId, "name deliveryHistory");
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }
        res.json({
            client: client.name,
            deliveries: deliveryHistory,
            clientHistory: client.deliveryHistory,
        });
    }
    catch (error) {
        console.error("Error fetching delivery history:", error);
        res.status(500).json({
            message: "Error retrieving delivery history",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.getDeliveryHistory = getDeliveryHistory;
/**
 * Get delivery trends over time
 */
const getDeliveryTrends = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { period } = req.query; // 'daily', 'weekly', or 'monthly'
        const { startDate, endDate } = req.query;
        let start = new Date();
        let end = new Date();
        // Set default date range if not provided
        if (startDate) {
            start = new Date(startDate);
        }
        else {
            // Default to last 30 days
            start.setDate(start.getDate() - 30);
        }
        if (endDate) {
            end = new Date(endDate);
        }
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        // Define grouping based on period
        let groupBy;
        let dateFormat;
        switch (period) {
            case "weekly":
                groupBy = {
                    $week: "$date",
                };
                dateFormat = "%Y-W%U"; // Year-WeekNumber
                break;
            case "monthly":
                groupBy = {
                    year: { $year: "$date" },
                    month: { $month: "$date" },
                };
                dateFormat = "%Y-%m"; // Year-Month
                break;
            case "daily":
            default:
                groupBy = {
                    $dateToString: { format: "%Y-%m-%d", date: "$date" },
                };
                dateFormat = "%Y-%m-%d"; // Year-Month-Day
        }
        // Run aggregation
        const trends = yield DailyDelivery_1.DailyDelivery.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end },
                },
            },
            {
                $group: {
                    _id: groupBy,
                    totalDeliveries: { $sum: 1 },
                    successfulDeliveries: {
                        $sum: {
                            $cond: [{ $eq: ["$deliveryStatus", "Delivered"] }, 1, 0],
                        },
                    },
                    totalQuantity: { $sum: "$quantity" },
                    totalRevenue: { $sum: "$price" },
                },
            },
            {
                $project: {
                    period: "$_id",
                    totalDeliveries: 1,
                    successfulDeliveries: 1,
                    successRate: {
                        $multiply: [
                            {
                                $cond: [
                                    { $eq: ["$totalDeliveries", 0] },
                                    0,
                                    { $divide: ["$successfulDeliveries", "$totalDeliveries"] },
                                ],
                            },
                            100,
                        ],
                    },
                    totalQuantity: 1,
                    totalRevenue: 1,
                    _id: 0,
                },
            },
            { $sort: { period: 1 } },
        ]);
        res.json(trends);
    }
    catch (error) {
        console.error("Error fetching delivery trends:", error);
        res.status(500).json({
            message: "Error retrieving delivery trends",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.getDeliveryTrends = getDeliveryTrends;
/**
 * Get non-delivery reasons summary
 */
/**
 * Get priority clients data for dashboard
 */
const getPriorityClientsData = (startDate, endDate, shiftFilter) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Create a matching condition based on date and shift
        const matchCondition = {
            priorityStatus: true,
        };
        // Add shift filter if provided
        if (shiftFilter) {
            matchCondition.timeShift = shiftFilter;
        }
        // First, get all priority clients
        const priorityClients = yield Client_1.Client.find(matchCondition)
            .select('_id name location timeShift quantity deliveryStatus')
            .lean();
        // Get the latest delivery status for these clients
        const clientIds = priorityClients.map(client => client._id);
        // Get today's delivery records for these clients
        const deliveryRecords = yield DailyDelivery_1.DailyDelivery.find({
            clientId: { $in: clientIds },
            date: { $gte: startDate, $lte: endDate }
        }).lean(); // Create a map of client ID to delivery status
        const deliveryStatusMap = new Map();
        deliveryRecords.forEach(record => {
            deliveryStatusMap.set(record.clientId.toString(), record.deliveryStatus);
        });
        // Merge the data
        const priorityClientData = priorityClients.map(client => {
            const deliveryStatus = deliveryStatusMap.get(client._id.toString()) || 'Pending';
            return Object.assign(Object.assign({}, client), { deliveryStatus });
        });
        return priorityClientData;
    }
    catch (error) {
        console.error("Error fetching priority clients data:", error);
        return [];
    }
});
const getNonDeliveryReasons = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate } = req.query;
        let start = new Date();
        let end = new Date();
        // Set default date range if not provided
        if (startDate) {
            start = new Date(startDate);
        }
        else {
            // Default to last 30 days
            start.setDate(start.getDate() - 30);
        }
        if (endDate) {
            end = new Date(endDate);
        }
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        const nonDeliveryReasons = yield DailyDelivery_1.DailyDelivery.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end },
                    deliveryStatus: "Not Delivered",
                    notes: { $exists: true, $ne: "" },
                },
            },
            {
                $group: {
                    _id: "$notes",
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    reason: "$_id",
                    count: 1,
                    _id: 0,
                },
            },
            { $sort: { count: -1 } },
        ]);
        res.json(nonDeliveryReasons);
    }
    catch (error) {
        console.error("Error fetching non-delivery reasons:", error);
        res.status(500).json({
            message: "Error retrieving non-delivery reasons",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.getNonDeliveryReasons = getNonDeliveryReasons;
/**
 * Debug endpoint to diagnose delivery data issues with date comparisons
 */
const debugDeliveryData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Parse date from query or use today
        let date = new Date();
        if (req.query.date) {
            date = new Date(req.query.date);
        }
        // Create start and end dates for the full day
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        console.log(`DEBUG: Querying deliveries between ${startDate.toISOString()} and ${endDate.toISOString()}`);
        // Query using date range
        const rangeDeliveries = yield DailyDelivery_1.DailyDelivery.find({
            date: { $gte: startDate, $lte: endDate },
        })
            .populate("clientId", "name")
            .populate("staffId", "name")
            .lean();
        // Query using exact date (the problematic approach)
        const exactDateDeliveries = yield DailyDelivery_1.DailyDelivery.find({
            date: startDate,
        }).lean();
        // Get raw delivery statuses for comparison
        const rawDeliveryStatuses = yield DailyDelivery_1.DailyDelivery.distinct("deliveryStatus");
        // Count by delivery status
        const statusCounts = {
            Delivered: 0,
            "Not Delivered": 0,
        };
        rangeDeliveries.forEach((delivery) => {
            const status = delivery.deliveryStatus;
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        // All deliveries in database (for small test datasets)
        const allDeliveries = yield DailyDelivery_1.DailyDelivery.find()
            .sort({ date: -1 })
            .limit(20)
            .lean();
        // Check actual dates stored in database
        const allDates = allDeliveries.map((d) => ({
            date: d.date,
            dateString: d.date.toISOString(),
            clientId: d.clientId,
            status: d.deliveryStatus,
        }));
        // Format for readability
        const readableRangeDeliveries = rangeDeliveries.map((delivery) => {
            var _a, _b;
            return ({
                id: delivery._id.toString(),
                clientName: ((_a = delivery.clientId) === null || _a === void 0 ? void 0 : _a.name) || "Unknown",
                staffName: ((_b = delivery.staffId) === null || _b === void 0 ? void 0 : _b.name) || "Unknown",
                shift: delivery.shift,
                date: delivery.date,
                exactHoursMinsSecs: `${delivery.date.getHours()}:${delivery.date.getMinutes()}:${delivery.date.getSeconds()}`,
                deliveryStatus: delivery.deliveryStatus,
                quantity: delivery.quantity,
                price: delivery.price,
            });
        });
        res.json({
            queryDate: date.toISOString(),
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            rangeDeliveriesCount: rangeDeliveries.length,
            exactDateDeliveriesCount: exactDateDeliveries.length,
            rawDeliveryStatuses,
            statusCounts,
            rangeDeliveries: readableRangeDeliveries,
            allDatesInDb: allDates,
        });
    }
    catch (error) {
        console.error("Error in debug delivery data:", error);
        res.status(500).json({
            message: "Error debugging delivery data",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.debugDeliveryData = debugDeliveryData;
const getTodaysDeliveryRecords = (startDate, endDate, shiftFilter) => __awaiter(void 0, void 0, void 0, function* () {
    // Ensure proper date comparison
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    const matchCriteria = {
        date: { $gte: startDate, $lte: endDate },
    };
    if (shiftFilter && ["AM", "PM"].includes(shiftFilter)) {
        matchCriteria.shift = shiftFilter;
    }
    const deliveryRecords = yield DailyDelivery_1.DailyDelivery.aggregate([
        {
            $match: matchCriteria,
        },
        {
            $sort: { date: -1 },
        },
        {
            $lookup: {
                from: "clients",
                localField: "clientId",
                foreignField: "_id",
                as: "clientInfo",
            },
        },
        {
            $lookup: {
                from: "staffs",
                localField: "staffId",
                foreignField: "_id",
                as: "staffInfo",
            },
        },
        {
            $unwind: {
                path: "$clientInfo",
                preserveNullAndEmptyArrays: true,
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
                clientName: { $ifNull: ["$clientInfo.name", "Unknown"] },
                location: { $ifNull: ["$clientInfo.location", ""] },
                staff: { $ifNull: ["$staffInfo.name", "Unknown"] },
                shift: 1,
                quantity: 1,
                price: 1,
                status: "$deliveryStatus",
            },
        },
    ]);
    return deliveryRecords;
});
