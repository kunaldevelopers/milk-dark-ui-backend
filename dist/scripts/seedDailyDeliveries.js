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
const mongoose_1 = __importDefault(require("mongoose"));
const Client_1 = require("../models/Client");
const Staff_1 = require("../models/Staff");
const StaffSession_1 = require("../models/StaffSession");
const DailyDelivery_1 = require("../models/DailyDelivery");
const User_1 = require("../models/User");
const config_1 = require("../config");
/**
 * Seed script to generate demo data for the daily delivery system with AM/PM shifts
 */
const seedDailyDeliveries = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Starting demo data seeding process...");
        yield mongoose_1.default.connect(config_1.config.mongoUri);
        // First, ensure the specified user has a Staff document linked
        const targetUserId = "68120be15ad7082d47fb3049";
        console.log(`Ensuring staff record exists for user ID: ${targetUserId}`);
        // Check if user exists
        const user = yield User_1.User.findById(targetUserId);
        if (!user) {
            console.log(`User with ID ${targetUserId} not found. Please create this user first.`);
        }
        else {
            // Check if staff record exists for this user
            let staffRecord = yield Staff_1.Staff.findOne({ userId: targetUserId });
            if (!staffRecord) {
                // Create staff record for this user
                staffRecord = yield Staff_1.Staff.create({
                    userId: targetUserId,
                    name: user.name || user.username,
                    contactNumber: user.contactNumber,
                    location: user.location,
                    assignedClients: [],
                    isAvailable: true,
                    totalMilkQuantity: 0,
                });
                console.log(`Created new staff record for user ${targetUserId} with staff ID: ${staffRecord._id}`);
            }
            else {
                console.log(`Found existing staff record for user ${targetUserId} with staff ID: ${staffRecord._id}`);
            }
            // Ensure current date (2025-05-01) session exists for this staff
            const currentDate = new Date("2025-05-01");
            currentDate.setHours(0, 0, 0, 0);
            const randomShift = Math.random() > 0.5 ? "AM" : "PM";
            const existingSession = yield StaffSession_1.StaffSession.findOne({
                staffId: staffRecord._id,
                date: currentDate,
            });
            if (!existingSession) {
                // Create a session for the current date
                const session = yield StaffSession_1.StaffSession.create({
                    staffId: staffRecord._id,
                    shift: randomShift,
                    date: currentDate,
                });
                console.log(`Created session for staff ${staffRecord._id} on 2025-05-01 with ${randomShift} shift`);
            }
            else {
                console.log(`Found existing session for staff ${staffRecord._id} on 2025-05-01 with ${existingSession.shift} shift`);
            }
        }
        // Get existing staff and clients
        const staffMembers = yield Staff_1.Staff.find().limit(5);
        console.log(`Found ${staffMembers.length} staff members`);
        const clients = yield Client_1.Client.find().limit(30);
        console.log(`Found ${clients.length} clients`);
        if (clients.length === 0 || staffMembers.length === 0) {
            console.log("Not enough staff or clients found. Please run the basic seeding script first.");
            yield mongoose_1.default.disconnect();
            return;
        }
        // Ensure clients have timeShift values (randomly assign if not present)
        for (const client of clients) {
            if (!client.timeShift) {
                client.timeShift = Math.random() > 0.5 ? "AM" : "PM";
                yield client.save();
                console.log(`Updated client ${client.name} with ${client.timeShift} shift`);
            }
        }
        // Create sample dates for historical data (past 3 days plus today)
        const today = new Date("2025-05-01"); // Use the specific date
        today.setHours(0, 0, 0, 0);
        const dates = [
            new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // yesterday
            today, // today (2025-05-01)
            new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000), // tomorrow (for testing future dates)
        ];
        // For each date, create staff sessions and deliveries
        for (const date of dates) {
            console.log(`Seeding data for date: ${date.toISOString().split("T")[0]}`);
            // Create staff sessions for each date (random AM/PM assignments)
            const staffSessions = [];
            for (const staff of staffMembers) {
                const shift = Math.random() > 0.5 ? "AM" : "PM";
                const existingSession = yield StaffSession_1.StaffSession.findOne({
                    staffId: staff._id,
                    date: date,
                });
                if (existingSession) {
                    existingSession.shift = shift;
                    yield existingSession.save();
                    staffSessions.push(existingSession);
                    console.log(`Updated session for staff ${staff.name}: ${shift} shift on ${date.toISOString().split("T")[0]}`);
                }
                else {
                    const newSession = yield StaffSession_1.StaffSession.create({
                        staffId: staff._id,
                        shift,
                        date,
                    });
                    staffSessions.push(newSession);
                    console.log(`Created session for staff ${staff.name}: ${shift} shift on ${date.toISOString().split("T")[0]}`);
                }
            }
            // Create deliveries for AM shift
            const amStaffIds = staffSessions
                .filter((session) => session.shift === "AM")
                .map((session) => session.staffId);
            const amClients = clients.filter((client) => client.timeShift === "AM");
            // Distribute AM clients among AM staff
            if (amStaffIds.length > 0) {
                for (const client of amClients) {
                    // Random staff assignment for this client on this date
                    const randomStaffId = amStaffIds[Math.floor(Math.random() * amStaffIds.length)];
                    // Random delivery status (80% delivered, 20% not delivered)
                    const isDelivered = Math.random() > 0.2;
                    const deliveryStatus = isDelivered ? "Delivered" : "Not Delivered";
                    const quantity = isDelivered ? client.quantity : 0;
                    const price = isDelivered
                        ? client.quantity * client.pricePerLitre
                        : 0;
                    const notes = isDelivered ? "" : "Customer not available";
                    // Check if there's an existing delivery record for this day and client
                    const existingDelivery = yield DailyDelivery_1.DailyDelivery.findOne({
                        clientId: client._id,
                        date: date,
                    });
                    if (existingDelivery) {
                        existingDelivery.staffId = randomStaffId;
                        existingDelivery.shift = "AM";
                        existingDelivery.deliveryStatus = deliveryStatus;
                        existingDelivery.quantity = quantity;
                        existingDelivery.price = price;
                        existingDelivery.notes = notes;
                        yield existingDelivery.save();
                    }
                    else {
                        yield DailyDelivery_1.DailyDelivery.create({
                            clientId: client._id,
                            staffId: randomStaffId,
                            date: date,
                            shift: "AM",
                            deliveryStatus: deliveryStatus,
                            quantity: quantity,
                            price: price,
                            notes: notes,
                        });
                    }
                }
                console.log(`Created/updated deliveries for ${amClients.length} AM clients on ${date.toISOString().split("T")[0]}`);
            }
            // Create deliveries for PM shift
            const pmStaffIds = staffSessions
                .filter((session) => session.shift === "PM")
                .map((session) => session.staffId);
            const pmClients = clients.filter((client) => client.timeShift === "PM");
            // Distribute PM clients among PM staff
            if (pmStaffIds.length > 0) {
                for (const client of pmClients) {
                    // Random staff assignment for this client on this date
                    const randomStaffId = pmStaffIds[Math.floor(Math.random() * pmStaffIds.length)];
                    // Random delivery status (80% delivered, 20% not delivered)
                    const isDelivered = Math.random() > 0.2;
                    const deliveryStatus = isDelivered ? "Delivered" : "Not Delivered";
                    const quantity = isDelivered ? client.quantity : 0;
                    const price = isDelivered
                        ? client.quantity * client.pricePerLitre
                        : 0;
                    const notes = isDelivered ? "" : "Customer not available";
                    // Check if there's an existing delivery record for this day and client
                    const existingDelivery = yield DailyDelivery_1.DailyDelivery.findOne({
                        clientId: client._id,
                        date: date,
                    });
                    if (existingDelivery) {
                        existingDelivery.staffId = randomStaffId;
                        existingDelivery.shift = "PM";
                        existingDelivery.deliveryStatus = deliveryStatus;
                        existingDelivery.quantity = quantity;
                        existingDelivery.price = price;
                        existingDelivery.notes = notes;
                        yield existingDelivery.save();
                    }
                    else {
                        yield DailyDelivery_1.DailyDelivery.create({
                            clientId: client._id,
                            staffId: randomStaffId,
                            date: date,
                            shift: "PM",
                            deliveryStatus: deliveryStatus,
                            quantity: quantity,
                            price: price,
                            notes: notes,
                        });
                    }
                }
                console.log(`Created/updated deliveries for ${pmClients.length} PM clients on ${date.toISOString().split("T")[0]}`);
            }
        }
        console.log("Demo data seeding completed!");
        yield mongoose_1.default.disconnect();
    }
    catch (error) {
        console.error("Error in demo data seeding:", error);
        yield mongoose_1.default.disconnect();
    }
});
// Execute the seeding function
seedDailyDeliveries();
// Step 5 implemented: Created demo data seeding script
