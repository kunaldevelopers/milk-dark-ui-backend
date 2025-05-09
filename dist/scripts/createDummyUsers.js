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
exports.initializeDummyUsers = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const User_1 = require("../models/User");
const initializeDummyUsers = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check if users already exist
        const existingUsers = yield User_1.User.find({});
        if (existingUsers.length === 0) {
            console.log("No existing users found. Creating dummy users...");
            // Create admin user
            const adminPassword = yield bcrypt_1.default.hash("admin123", 10);
            yield User_1.User.create({
                username: "admin",
                password: adminPassword,
                role: "admin",
                name: "System Admin",
                contactNumber: "1234567890",
                location: "Head Office",
            });
            console.log("✓ Admin user created successfully");
            // Create staff user
            const staffPassword = yield bcrypt_1.default.hash("staff123", 10);
            yield User_1.User.create({
                username: "staff",
                password: staffPassword,
                role: "staff",
                name: "Test Staff",
                contactNumber: "9876543210",
                location: "Branch Office",
            });
            console.log("✓ Staff user created successfully");
            console.log("\nTest credentials:");
            console.log("Admin - username: admin, password: admin123");
            console.log("Staff - username: staff, password: staff123");
        }
        else {
            console.log("✓ Default users already exist in the database");
        }
    }
    catch (error) {
        console.error("❌ Error initializing dummy users:", error);
        throw error;
    }
});
exports.initializeDummyUsers = initializeDummyUsers;
// Keep the standalone script functionality for manual runs
if (require.main === module) {
    mongoose_1.default
        .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/milk-farm-crm")
        .then(() => (0, exports.initializeDummyUsers)())
        .then(() => process.exit(0))
        .catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
