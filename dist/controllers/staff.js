"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.getDailyDeliveries = exports.markDailyUndelivered = exports.markDailyDelivered = exports.getAllAssignments = exports.updateAssignedClients = exports.markClientDailyUndelivered = exports.markClientDailyDelivered = exports.getSessionByDate = exports.selectShift = exports.markClientUndelivered = exports.markClientDelivered = exports.removeAssignment = exports.assignClient = exports.remove = exports.update = exports.create = exports.getAssignedClients = exports.getByUserId = exports.getById = exports.getAll = void 0;
const Staff_1 = require("../models/Staff");
const Client_1 = require("../models/Client");
const User_1 = require("../models/User");
const StaffSession_1 = require("../models/StaffSession");
const DailyDelivery_1 = require("../models/DailyDelivery");
const bcrypt_1 = __importDefault(require("bcrypt"));
const mongoose_1 = __importStar(require("mongoose"));
const getAll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required" });
        }
        // Populate user data and select required fields
        const staffMembers = yield Staff_1.Staff.find()
            .populate({
            path: "userId",
            model: "User",
            select: "username name role",
        })
            .lean();
        // Format the response
        const formattedStaff = staffMembers.map((staff) => {
            var _a;
            return ({
                _id: staff._id,
                name: staff.name,
                username: ((_a = staff.userId) === null || _a === void 0 ? void 0 : _a.username) || "",
                contactNumber: staff.contactNumber,
                location: staff.location,
                shift: staff.shift,
                assignedClients: staff.assignedClients,
                totalMilkQuantity: staff.totalMilkQuantity,
                isAvailable: staff.isAvailable,
                lastDeliveryDate: staff.lastDeliveryDate,
                createdAt: staff.createdAt || new Date(),
                updatedAt: staff.updatedAt || new Date(),
            });
        });
        res.json(formattedStaff);
    }
    catch (error) {
        console.error("Error fetching staff:", error);
        res.status(500).json({ message: "Error fetching staff members" });
    }
});
exports.getAll = getAll;
const getById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const staff = yield Staff_1.Staff.findById(req.params.id).populate("userId", "username");
        if (!staff) {
            return res.status(404).json({ message: "Staff member not found" });
        }
        // Format the response to include username
        const staffObj = staff.toObject();
        const userObj = staffObj.userId;
        const formattedStaff = Object.assign(Object.assign({}, staffObj), { username: (userObj === null || userObj === void 0 ? void 0 : userObj.username) || "" });
        res.json(formattedStaff);
    }
    catch (error) {
        console.error("Error fetching staff member:", error);
        res.status(500).json({ message: "Error fetching staff member" });
    }
});
exports.getById = getById;
const getByUserId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log(`[STAFF DEBUG] Starting getByUserId for userId: ${req.params.userId}`);
        const { userId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            console.error(`[STAFF DEBUG] Invalid user ID format: ${userId}`);
            return res.status(400).json({
                message: "Invalid user ID format",
                debug: { userId },
            });
        }
        // Find user and verify role
        const user = yield User_1.User.findById(userId);
        if (!user) {
            console.error(`[STAFF DEBUG] User not found for ID: ${userId}`);
            return res.status(404).json({
                message: "User not found",
                debug: { userId },
            });
        }
        if (user.role !== "staff") {
            console.error(`[STAFF DEBUG] User ${userId} is not a staff member (role: ${user.role})`);
            return res.status(403).json({
                message: "User exists but is not a staff member",
                debug: { userId, actualRole: user.role },
            });
        }
        // Try to find existing staff record
        let staff = yield Staff_1.Staff.findOne({ userId: new mongoose_1.Types.ObjectId(userId) });
        // If no staff record exists, create one
        if (!staff) {
            console.log(`[STAFF DEBUG] Creating new staff record for user ${userId}`);
            try {
                staff = yield Staff_1.Staff.create({
                    userId: new mongoose_1.Types.ObjectId(userId),
                    name: user.name || user.username,
                    shift: "AM",
                    assignedClients: [],
                    isAvailable: true,
                    totalMilkQuantity: 0,
                });
                console.log(`[STAFF DEBUG] Successfully created new staff record:`, {
                    staffId: staff._id,
                    userId: staff.userId,
                });
            }
            catch (createError) {
                console.error(`[STAFF DEBUG] Failed to create staff record:`, createError);
                return res.status(500).json({
                    message: "Failed to create staff record",
                    error: createError instanceof Error
                        ? createError.message
                        : "Unknown error",
                });
            }
        }
        if (!staff) {
            return res.status(500).json({
                message: "Failed to retrieve or create staff record",
            });
        }
        // Populate the user data
        yield staff.populate("userId", "username name role");
        console.log(`[STAFF DEBUG] Successfully retrieved staff record:`, {
            staffId: staff._id,
            userId: staff.userId,
            assignedClients: ((_a = staff.assignedClients) === null || _a === void 0 ? void 0 : _a.length) || 0,
        });
        res.json(staff);
    }
    catch (error) {
        console.error("[STAFF DEBUG] Error in getByUserId:", error);
        res.status(500).json({
            message: "Error retrieving staff information",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.getByUserId = getByUserId;
const getAssignedClients = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const staffId = req.params.id;
        const { includeAll, date } = req.query;
        console.log(`[DEBUG] Fetching clients for staff ID: ${staffId}, date: ${date || "today"}`);
        if (!mongoose_1.default.Types.ObjectId.isValid(staffId)) {
            return res.status(400).json({
                message: "Invalid staff ID format",
                details: `Provided ID ${staffId} is not a valid MongoDB ObjectId`,
            });
        }
        const staff = yield Staff_1.Staff.findById(staffId);
        if (!staff) {
            return res.status(404).json({
                message: "Staff member not found",
                details: `No staff record exists for ID ${staffId}`,
            });
        }
        // Get current staff session to determine shift
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const staffSession = yield StaffSession_1.StaffSession.findOne({
            staffId: new mongoose_1.default.Types.ObjectId(staffId),
            date: today,
        });
        console.log(`[DEBUG] Staff ${staffId} session for today:`, staffSession);
        if (!staff.assignedClients || staff.assignedClients.length === 0) {
            return res.json([]);
        }
        // Get all assigned clients WITHOUT using their stored delivery status
        const assignedClients = yield Client_1.Client.find({
            _id: { $in: staff.assignedClients },
        })
            .sort({ name: 1 })
            .select("_id name number location timeShift quantity pricePerLitre") // Removed deliveryStatus from selection
            .lean();
        console.log(`[DEBUG] Found ${assignedClients.length} total clients for staff ${staffId}`);
        // Parse requested date or use today
        let requestDate = today;
        if (date) {
            requestDate = new Date(date);
            requestDate.setHours(0, 0, 0, 0);
        }
        const endOfRequestDate = new Date(requestDate);
        endOfRequestDate.setHours(23, 59, 59, 999);
        console.log(`[DEBUG] Fetching delivery status for date: ${requestDate.toISOString()}`);
        // Get all daily deliveries for this staff and date
        const dailyDeliveries = yield DailyDelivery_1.DailyDelivery.find({
            staffId,
            date: {
                $gte: requestDate,
                $lte: endOfRequestDate,
            },
        }).lean();
        console.log(`[DEBUG] Found ${dailyDeliveries.length} daily delivery records for ${requestDate.toDateString()}`);
        // Create a map of client IDs to their daily delivery status
        const clientDeliveryStatusMap = new Map();
        dailyDeliveries.forEach((delivery) => {
            clientDeliveryStatusMap.set(delivery.clientId.toString(), {
                deliveryStatus: delivery.deliveryStatus,
                notes: delivery.notes,
                quantity: delivery.quantity,
            });
        });
        // Update client objects with their daily delivery status
        for (const client of assignedClients) {
            const dailyStatus = clientDeliveryStatusMap.get(client._id.toString());
            if (dailyStatus) {
                // If we have a daily record, use that status
                client.deliveryStatus = dailyStatus.deliveryStatus;
                client.deliveryNotes = dailyStatus.notes;
                // Add type assertion to fix TypeScript error
                client.dailyQuantity = dailyStatus.quantity;
            }
            else {
                // If no daily record exists for this date, ALWAYS set status to Pending
                client.deliveryStatus = "Pending";
                client.deliveryNotes = undefined;
            }
        }
        console.log(`[DEBUG] Updated all client statuses based on daily deliveries`);
        // Only return clients matching current shift unless includeAll is true
        if (includeAll !== "true" && (staffSession === null || staffSession === void 0 ? void 0 : staffSession.shift)) {
            const filteredClients = assignedClients.filter((client) => client.timeShift === staffSession.shift);
            console.log(`[DEBUG] Filtered to ${filteredClients.length} clients for ${staffSession.shift} shift`);
            return res.json(filteredClients);
        }
        res.json(assignedClients);
    }
    catch (error) {
        console.error("Error in getAssignedClients:", error);
        res.status(500).json({
            message: "Error fetching assigned clients",
            error: error instanceof Error ? error.message : "Unknown error",
            details: "An unexpected error occurred while fetching assigned clients",
        });
    }
});
exports.getAssignedClients = getAssignedClients;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Check if user is admin
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
            return res.status(403).json({
                message: "Unauthorized access. Only admins can create staff members",
            });
        }
        const { name, username, password, contactNumber, location, shift } = req.body;
        // Import settings helper
        const { getSetting } = yield Promise.resolve().then(() => __importStar(require("../models/Settings")));
        // Get valid shifts and roles from database
        const validShifts = yield getSetting("shifts");
        const validRoles = yield getSetting("roles");
        const defaultRole = (yield getSetting("defaultRole")) || "staff";
        // Validate required fields
        if (!name || !username || !password) {
            return res.status(400).json({
                message: "Missing required fields",
                details: "Name, username, and password are required",
            });
        }
        // Validate shift if provided
        if (shift && validShifts && !validShifts.includes(shift)) {
            return res.status(400).json({
                message: `Invalid shift. Must be one of: ${validShifts.join(", ")}`,
            });
        }
        // Use default shift from settings
        const defaultShift = (yield getSetting("defaultShift")) || "AM";
        const staffShift = shift || defaultShift;
        // Check if username already exists
        const existingUser = yield User_1.User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "Username already exists" });
        }
        // Create user with better error handling
        let newUser;
        try {
            const hashedPassword = yield bcrypt_1.default.hash(password, 10);
            newUser = yield User_1.User.create({
                username,
                password: hashedPassword,
                name,
                role: defaultRole,
                contactNumber,
                location,
            });
        }
        catch (userError) {
            console.error("Error creating user:", userError);
            return res.status(500).json({
                message: "Error creating user account",
                details: userError instanceof Error ? userError.message : "Unknown error",
            });
        }
        // Create staff record with user reference
        try {
            const staffData = {
                userId: newUser._id,
                name,
                contactNumber,
                location,
                shift: staffShift,
                assignedClients: [],
                isAvailable: true,
            };
            const staff = new Staff_1.Staff(staffData);
            yield staff.save();
            return res.status(201).json({
                message: "Staff created successfully",
                staff: Object.assign(Object.assign({}, staff.toObject()), { username }),
            });
        }
        catch (staffError) {
            // If staff creation fails, clean up the created user
            yield User_1.User.findByIdAndDelete(newUser._id);
            console.error("Error creating staff record:", staffError);
            return res.status(500).json({
                message: "Error creating staff record",
                details: staffError instanceof Error ? staffError.message : "Unknown error",
            });
        }
    }
    catch (error) {
        console.error("Staff creation error:", error);
        return res.status(500).json({
            message: "Error creating staff member",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.create = create;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const staff = yield Staff_1.Staff.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });
        if (!staff) {
            return res.status(404).json({ message: "Staff member not found" });
        }
        res.json(staff);
    }
    catch (error) {
        res.status(500).json({ message: "Error updating staff member" });
    }
});
exports.update = update;
const remove = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const staff = yield Staff_1.Staff.findByIdAndDelete(req.params.id);
        if (!staff) {
            return res.status(404).json({ message: "Staff member not found" });
        }
        res.json({ message: "Staff member deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Error deleting staff member" });
    }
});
exports.remove = remove;
const assignClient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { staffId, clientId } = req.body;
        console.log(`[DEBUG] Assigning client ${clientId} to staff ${staffId}`);
        // Validate IDs
        if (!mongoose_1.default.Types.ObjectId.isValid(staffId) ||
            !mongoose_1.default.Types.ObjectId.isValid(clientId)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }
        // Validate staff exists
        const staff = yield Staff_1.Staff.findById(staffId);
        if (!staff) {
            return res.status(404).json({ message: "Staff member not found" });
        }
        // Validate client exists
        const client = yield Client_1.Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }
        // Check if assignment already exists
        if (staff.assignedClients.some((id) => id.toString() === clientId)) {
            return res
                .status(400)
                .json({ message: "Client already assigned to this staff member" });
        }
        // Check if client is already assigned to another staff
        if (client.assignedStaff) {
            return res.status(400).json({
                message: "Client is already assigned to another staff member. Please unassign first.",
            });
        }
        // Add client to staff's assignments
        staff.assignedClients.push(clientId); // Cast to any to avoid TS error
        // Set staff as client's assigned staff
        client.assignedStaff = staffId; // Cast to any to avoid TS error
        // Save both documents
        yield Promise.all([staff.save(), client.save()]);
        console.log(`[DEBUG] Successfully assigned client ${clientId} to staff ${staffId}`);
        res.json({
            message: "Assignment successful",
            staff: Object.assign(Object.assign({}, staff.toObject()), { assignedClients: staff.assignedClients }),
        });
    }
    catch (error) {
        console.error("[DEBUG] Assignment error:", error);
        res.status(500).json({
            message: "Error creating assignment",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.assignClient = assignClient;
const removeAssignment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { staffId, clientId } = req.body;
        console.log(`[DEBUG] Removing assignment between staff ${staffId} and client ${clientId}`);
        if (!mongoose_1.default.Types.ObjectId.isValid(staffId) ||
            !mongoose_1.default.Types.ObjectId.isValid(clientId)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }
        // Find and validate staff
        const staff = yield Staff_1.Staff.findById(staffId);
        if (!staff) {
            return res.status(404).json({ message: "Staff member not found" });
        }
        // Find and validate client
        const client = yield Client_1.Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }
        // Verify the assignment exists
        if (!staff.assignedClients.some((id) => id.toString() === clientId)) {
            return res
                .status(400)
                .json({ message: "This client is not assigned to this staff member" });
        }
        // Remove client from staff's assignments
        staff.assignedClients = staff.assignedClients.filter((id) => id.toString() !== clientId);
        // Clear staff assignment from client
        client.assignedStaff = undefined;
        // Save both documents
        yield Promise.all([staff.save(), client.save()]);
        console.log(`[DEBUG] Successfully removed assignment between staff ${staffId} and client ${clientId}`);
        res.json({
            message: "Assignment removed successfully",
            staff: Object.assign(Object.assign({}, staff.toObject()), { assignedClients: staff.assignedClients }),
        });
    }
    catch (error) {
        console.error("[DEBUG] Remove assignment error:", error);
        res.status(500).json({
            message: "Error removing assignment",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.removeAssignment = removeAssignment;
const markClientDelivered = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params; // client ID from URL
        console.log(`Marking client ${id} as delivered`);
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid client ID format" });
        }
        const client = yield Client_1.Client.findById(id);
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }
        // Get today's date at midnight for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Try to find an existing delivery record for today
        let delivery = yield DailyDelivery_1.DailyDelivery.findOne({
            clientId: client._id,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
            },
        });
        if (delivery) {
            // Update existing record
            delivery.deliveryStatus = "Delivered";
            delivery.quantity = client.quantity;
            delivery.price = client.quantity * client.pricePerLitre;
            delivery.staffId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
            yield delivery.save();
        }
        else {
            // Create new delivery record
            delivery = new DailyDelivery_1.DailyDelivery({
                clientId: client._id,
                staffId: (_b = req.user) === null || _b === void 0 ? void 0 : _b._id,
                date: new Date(),
                shift: client.timeShift,
                deliveryStatus: "Delivered",
                quantity: client.quantity,
                price: client.quantity * client.pricePerLitre,
            });
            yield delivery.save();
        }
        // Update client status
        client.deliveryStatus = "Delivered";
        yield client.save();
        res.json({ message: "Client marked as delivered", client, delivery });
    }
    catch (error) {
        console.error("Error marking client as delivered:", error);
        res.status(500).json({ message: "Error updating delivery status" });
    }
});
exports.markClientDelivered = markClientDelivered;
const markClientUndelivered = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { reason } = req.body;
        console.log(`Marking client ${id} as undelivered. Reason: ${reason || "Not provided"}`);
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid client ID format" });
        }
        const client = yield Client_1.Client.findById(id);
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }
        // Get today's date at midnight for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Get staff ID from either the user's staff record or the user ID
        let staffId = undefined;
        if ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id) {
            const staffRecord = yield Staff_1.Staff.findOne({ userId: req.user._id });
            staffId = staffRecord === null || staffRecord === void 0 ? void 0 : staffRecord._id;
        }
        // Try to find an existing delivery record for today
        let delivery = yield DailyDelivery_1.DailyDelivery.findOne({
            clientId: client._id,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
            },
        });
        if (delivery) {
            // Update existing record
            delivery.deliveryStatus = "Not Delivered"; // Changed from "Not_Delivered"
            delivery.quantity = 0;
            delivery.price = 0;
            delivery.notes = reason;
            if (staffId) {
                delivery.staffId = staffId; // Cast to any to bypass strict type checking since we know the ID is valid
            }
            yield delivery.save();
        }
        else {
            // Create new delivery record
            delivery = new DailyDelivery_1.DailyDelivery({
                clientId: client._id,
                staffId: staffId,
                date: new Date(),
                shift: client.timeShift,
                deliveryStatus: "Not Delivered", // Changed from "Not_Delivered"
                quantity: 0,
                price: 0,
                notes: reason,
            });
            yield delivery.save();
        }
        // Update client status
        client.deliveryStatus = "Not Delivered"; // Changed from "Not_Delivered"
        client.deliveryNotes = reason;
        yield client.save();
        res.json({ message: "Client marked as not delivered", client, delivery });
    }
    catch (error) {
        console.error("Error marking client as undelivered:", error);
        res.status(500).json({ message: "Error updating delivery status" });
    }
});
exports.markClientUndelivered = markClientUndelivered;
const selectShift = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: staffId } = req.params;
        const { shift } = req.body;
        console.log(`[SERVER DEBUG] selectShift called with staffId: ${staffId}, shift: ${shift}`);
        if (!mongoose_1.default.Types.ObjectId.isValid(staffId)) {
            return res.status(400).json({ message: "Invalid staff ID format" });
        }
        // Basic validation - only allow AM or PM
        if (!shift || !["AM", "PM"].includes(shift)) {
            return res.status(400).json({
                message: "Valid shift (AM or PM) is required",
            });
        }
        // Verify staff exists
        const staff = yield Staff_1.Staff.findById(staffId);
        if (!staff) {
            return res.status(404).json({ message: "Staff member not found" });
        }
        console.log(`[SERVER DEBUG] Found staff with ID ${staffId}, name: ${staff.name}`);
        // Get today's date in a consistent format
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD format
        // Create a date object at 00:00:00 for today
        const today = new Date(todayStr);
        console.log(`[SERVER DEBUG] Creating session for date: ${today.toISOString()}`);
        // Delete any existing sessions for today (to avoid duplicates)
        const startOfDay = new Date(today);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        try {
            const deleteResult = yield StaffSession_1.StaffSession.deleteMany({
                staffId: new mongoose_1.default.Types.ObjectId(staffId),
                date: {
                    $gte: startOfDay,
                    $lte: endOfDay,
                },
            });
            console.log(`[SERVER DEBUG] Deleted ${deleteResult.deletedCount} existing sessions`);
        }
        catch (deleteErr) {
            console.error("[SERVER ERROR] Error deleting existing sessions:", deleteErr);
            // Continue anyway - this is not critical
        }
        // Create new session for today
        try {
            const staffSession = new StaffSession_1.StaffSession({
                staffId: new mongoose_1.default.Types.ObjectId(staffId),
                shift,
                date: today,
            });
            yield staffSession.save();
            console.log(`[SERVER DEBUG] Created new session with ID: ${staffSession._id}`);
            // Return success response
            return res.status(200).json({
                message: `${shift} shift selected successfully`,
                staffSession,
            });
        }
        catch (sessionErr) {
            console.error("[SERVER ERROR] Error creating new session:", sessionErr);
            return res.status(500).json({
                message: "Failed to create shift session",
                error: sessionErr instanceof Error ? sessionErr.message : "Unknown error",
            });
        }
    }
    catch (error) {
        console.error("[SERVER ERROR] Error in selectShift:", error);
        return res.status(500).json({
            message: "Error selecting shift",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.selectShift = selectShift;
const getSessionByDate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: staffId, date } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(staffId)) {
            return res.status(400).json({ message: "Invalid staff ID format" });
        }
        // Parse the provided date string correctly
        let sessionDate;
        try {
            // CRITICAL FIX: Properly convert string date to Date object
            if (date) {
                console.log(`[DEBUG] Parsing date string: ${date}`);
                sessionDate = new Date(date);
            }
            else {
                sessionDate = new Date();
            }
            // Don't modify the sessionDate - keep it as is
            console.log(`[DEBUG] Parsed sessionDate: ${sessionDate.toISOString()}`);
        }
        catch (dateError) {
            console.error("Error parsing date:", dateError, date);
            return res.status(400).json({ message: "Invalid date format" });
        }
        // Find session using date range accounting for timezone issues
        const startOfDay = new Date(sessionDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(sessionDate);
        endOfDay.setHours(23, 59, 59, 999);
        console.log(`[DEBUG] Looking for session with date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()} for staff ${staffId}`);
        const session = yield StaffSession_1.StaffSession.findOne({
            staffId,
            date: {
                $gte: startOfDay,
                $lte: endOfDay,
            },
        });
        if (!session) {
            console.log(`[DEBUG] No session found for staff ${staffId} on ${sessionDate.toISOString()}`);
            return res.status(404).json({
                message: "No shift selected for this date",
                staffId,
                date: sessionDate,
            });
        }
        console.log(`[DEBUG] Found session: ${session._id}, shift: ${session.shift}, date: ${session.date.toISOString()}`);
        res.json(session);
    }
    catch (error) {
        console.error("Error getting staff session:", error);
        res.status(500).json({
            message: "Error retrieving staff session",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.getSessionByDate = getSessionByDate;
const markClientDailyDelivered = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: staffId, clientId } = req.params;
        const { shift } = req.body;
        if (!shift) {
            return res.status(400).json({ message: "Shift is required" });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(staffId) ||
            !mongoose_1.default.Types.ObjectId.isValid(clientId)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }
        // Verify staff and client exist
        const staff = yield Staff_1.Staff.findById(staffId);
        if (!staff) {
            return res.status(404).json({ message: "Staff member not found" });
        }
        const client = yield Client_1.Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }
        // Check if client is assigned to this staff member
        if (!staff.assignedClients.some((id) => id.toString() === client._id.toString())) {
            return res.status(400).json({
                message: "This client is not assigned to this staff member",
            });
        }
        // Get today's date at midnight for consistent comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Get delivery status values from settings
        const { getSetting } = yield Promise.resolve().then(() => __importStar(require("../models/Settings")));
        const deliveryStatuses = yield getSetting("deliveryStatuses");
        const deliveredStatus = deliveryStatuses.find((s) => s === "Delivered") || "Delivered";
        // Record the delivery for today
        console.log(`[DEBUG] Marking client ${clientId} as delivered for date: ${today.toISOString()}`);
        // Create or update today's delivery record
        const dailyDelivery = yield DailyDelivery_1.DailyDelivery.findOneAndUpdate({
            clientId,
            staffId,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
            },
        }, {
            $set: {
                clientId,
                staffId,
                date: today,
                shift,
                deliveryStatus: "Delivered",
                quantity: client.quantity,
                price: client.quantity * client.pricePerLitre,
            },
        }, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
        });
        // Add to client's delivery history, but DON'T update the client's deliveryStatus field
        client.deliveryHistory.push({
            date: today,
            status: deliveredStatus,
            quantity: client.quantity,
        });
        yield client.save();
        res.json({
            message: "Delivery marked as completed",
            dailyDelivery,
        });
    }
    catch (error) {
        console.error("Error marking client daily delivery:", error);
        res.status(500).json({
            message: "Error updating delivery status",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.markClientDailyDelivered = markClientDailyDelivered;
const markClientDailyUndelivered = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: staffId, clientId } = req.params;
        const { reason, shift } = req.body;
        if (!shift) {
            return res.status(400).json({ message: "Shift is required" });
        }
        if (!reason) {
            return res
                .status(400)
                .json({ message: "Reason is required for non-delivery" });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(staffId) ||
            !mongoose_1.default.Types.ObjectId.isValid(clientId)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }
        // Verify staff and client exist
        const staff = yield Staff_1.Staff.findById(staffId);
        if (!staff) {
            return res.status(404).json({ message: "Staff member not found" });
        }
        const client = yield Client_1.Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ message: "Client not found" });
        }
        // Check if client is assigned to this staff member
        if (!staff.assignedClients.some((id) => id.toString() === client._id.toString())) {
            return res.status(400).json({
                message: "This client is not assigned to this staff member",
            });
        }
        // Get today's date at midnight for consistent comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Get delivery status values from settings
        const { getSetting } = yield Promise.resolve().then(() => __importStar(require("../models/Settings")));
        const deliveryStatuses = yield getSetting("deliveryStatuses");
        const notDeliveredStatus = deliveryStatuses.find((s) => s === "Not Delivered") ||
            "Not Delivered";
        // Record the non-delivery for today
        const dailyDelivery = yield DailyDelivery_1.DailyDelivery.findOneAndUpdate({
            clientId,
            staffId,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
            },
        }, {
            $set: {
                clientId,
                staffId,
                date: today,
                shift,
                deliveryStatus: "Not Delivered",
                quantity: 0,
                price: 0,
                notes: reason,
            },
        }, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
        });
        // Add to client's delivery history, but DON'T update client.deliveryStatus
        client.deliveryHistory.push({
            date: today,
            status: notDeliveredStatus,
            quantity: 0,
            reason,
        });
        yield client.save();
        res.json({
            message: "Client marked as not delivered",
            dailyDelivery,
        });
    }
    catch (error) {
        console.error("Error marking client as not delivered:", error);
        res.status(500).json({
            message: "Error updating delivery status",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.markClientDailyUndelivered = markClientDailyUndelivered;
const updateAssignedClients = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: staffId } = req.params;
        const { shift } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(staffId)) {
            return res.status(400).json({ message: "Invalid staff ID format" });
        }
        // Validate shift
        if (!["AM", "PM"].includes(shift)) {
            return res
                .status(400)
                .json({ message: "Invalid shift value. Must be AM or PM" });
        }
        const staff = yield Staff_1.Staff.findById(staffId);
        if (!staff) {
            return res.status(404).json({ message: "Staff not found" });
        }
        // Get all assigned clients
        const allAssignedClients = yield Client_1.Client.find({
            _id: { $in: staff.assignedClients },
        });
        // Filter clients based on shift
        const filteredClientIds = allAssignedClients
            .filter((client) => client.timeShift === shift)
            .map((client) => new mongoose_1.default.Types.ObjectId(client._id.toString()));
        // Update staff's assignedClients with filtered list
        staff.assignedClients = filteredClientIds;
        yield staff.save();
        console.log(`Updated assigned clients for staff ${staffId} with ${shift} shift. Now has ${filteredClientIds.length} clients.`);
        // Return filtered clients
        const updatedClients = yield Client_1.Client.find({
            _id: { $in: filteredClientIds },
        });
        res.json({
            message: `Successfully updated assigned clients based on ${shift} shift`,
            clients: updatedClients,
            count: filteredClientIds.length,
        });
    }
    catch (error) {
        console.error("Error updating assigned clients:", error);
        res.status(500).json({
            message: "Error updating assigned clients",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.updateAssignedClients = updateAssignedClients;
const getAllAssignments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        console.log("[STAFF DEBUG] Getting all staff-client assignments");
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required" });
        }
        // Get all staff members with their assigned clients
        const staffMembers = yield Staff_1.Staff.find()
            .populate({
            path: "userId",
            model: "User",
            select: "username name role",
        })
            .lean();
        const staffWithClients = [];
        for (const staff of staffMembers) {
            // Skip staff with no assigned clients
            if (!staff.assignedClients || staff.assignedClients.length === 0) {
                staffWithClients.push({
                    staff: {
                        _id: staff._id,
                        name: staff.name,
                        username: ((_a = staff.userId) === null || _a === void 0 ? void 0 : _a.username) || "",
                    },
                    clients: [],
                });
                continue;
            }
            // Find all clients assigned to this staff member
            const assignedClients = yield Client_1.Client.find({
                _id: { $in: staff.assignedClients },
            })
                .sort({ name: 1 })
                .select("_id name number location timeShift quantity pricePerLitre deliveryStatus")
                .lean();
            // Add to result
            staffWithClients.push({
                staff: {
                    _id: staff._id,
                    name: staff.name,
                    username: ((_b = staff.userId) === null || _b === void 0 ? void 0 : _b.username) || "",
                },
                clients: assignedClients || [],
            });
        }
        res.json(staffWithClients);
    }
    catch (error) {
        console.error("[STAFF DEBUG] Error in getAllAssignments:", error);
        res.status(500).json({
            message: "Error fetching staff assignments",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.getAllAssignments = getAllAssignments;
const markDailyDelivered = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { staffId, clientId, date } = req.body;
        const dailyDelivery = yield DailyDelivery_1.DailyDelivery.findOne({
            staffId,
            clientId,
            date: date || new Date().toISOString().split("T")[0],
        });
        if (!dailyDelivery) {
            const newDailyDelivery = new DailyDelivery_1.DailyDelivery({
                staffId,
                clientId,
                date: date || new Date().toISOString().split("T")[0],
                deliveryStatus: "Delivered",
            });
            yield newDailyDelivery.save();
        }
        else {
            dailyDelivery.deliveryStatus = "Delivered";
            yield dailyDelivery.save();
        }
        res.status(200).json({ message: "Delivery status updated successfully" });
    }
    catch (error) {
        console.error("Error in markDailyDelivered:", error);
        res.status(500).json({ message: "Failed to update delivery status" });
    }
});
exports.markDailyDelivered = markDailyDelivered;
const markDailyUndelivered = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { staffId, clientId, reason, date } = req.body;
        const dailyDelivery = yield DailyDelivery_1.DailyDelivery.findOne({
            staffId,
            clientId,
            date: date || new Date().toISOString().split("T")[0],
        });
        if (!dailyDelivery) {
            const newDailyDelivery = new DailyDelivery_1.DailyDelivery({
                staffId,
                clientId,
                date: date || new Date().toISOString().split("T")[0],
                deliveryStatus: "Not Delivered",
                reason,
            });
            yield newDailyDelivery.save();
        }
        else {
            dailyDelivery.deliveryStatus = "Not Delivered";
            dailyDelivery.reason = reason;
            yield dailyDelivery.save();
        }
        res.status(200).json({ message: "Delivery status updated successfully" });
    }
    catch (error) {
        console.error("Error in markDailyUndelivered:", error);
        res.status(500).json({ message: "Failed to update delivery status" });
    }
});
exports.markDailyUndelivered = markDailyUndelivered;
const getDailyDeliveries = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { staffId } = req.params;
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ message: "Date parameter is required" });
        }
        // Convert date string to Date object for the start of the day
        const queryDate = new Date(date);
        queryDate.setHours(0, 0, 0, 0);
        // Get the end of the day
        const endDate = new Date(queryDate);
        endDate.setHours(23, 59, 59, 999);
        const deliveries = yield DailyDelivery_1.DailyDelivery.find({
            staffId,
            date: {
                $gte: queryDate,
                $lte: endDate,
            },
        }).populate("clientId");
        res.status(200).json({ deliveries });
    }
    catch (error) {
        console.error("Error in getDailyDeliveries:", error);
        res.status(500).json({ message: "Failed to fetch daily deliveries" });
    }
});
exports.getDailyDeliveries = getDailyDeliveries;
