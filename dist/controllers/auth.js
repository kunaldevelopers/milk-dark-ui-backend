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
exports.register = exports.login = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const User_1 = require("../models/User");
const Staff_1 = require("../models/Staff");
const config_1 = require("../config");
const mongoose_1 = require("mongoose");
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password } = req.body;
        console.log(`[AUTH DEBUG] Login attempt for username: ${username}`);
        // Explicitly type user with UserDocument interface
        const user = (yield User_1.User.findOne({ username }));
        if (!user) {
            console.log(`[AUTH DEBUG] User not found: ${username}`);
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const isValidPassword = yield bcrypt_1.default.compare(password, user.password);
        if (!isValidPassword) {
            console.log(`[AUTH DEBUG] Invalid password for user: ${username}`);
            return res.status(401).json({ message: "Invalid credentials" });
        }
        // If this is a staff user, ensure they have a staff record
        if (user.role === "staff") {
            console.log(`[AUTH DEBUG] Checking staff record for user: ${user._id}`);
            // Try different methods to find the staff record
            let existingStaff = yield Staff_1.Staff.findOne({ userId: user._id });
            if (!existingStaff) {
                // Try string comparison as fallback
                existingStaff = yield Staff_1.Staff.findOne({
                    $expr: {
                        $eq: [{ $toString: "$userId" }, user._id.toString()],
                    },
                });
            }
            if (!existingStaff) {
                console.log(`[AUTH DEBUG] Creating new staff record for user: ${user._id}`);
                try {
                    const newStaff = new Staff_1.Staff({
                        userId: new mongoose_1.Types.ObjectId(user._id.toString()),
                        name: user.name || user.username,
                        shift: "AM", // Default shift
                        assignedClients: [],
                        isAvailable: true,
                        totalMilkQuantity: 0,
                    });
                    yield newStaff.save();
                    console.log(`[AUTH DEBUG] Created staff record with ID: ${newStaff._id}`);
                }
                catch (staffError) {
                    console.error(`[AUTH DEBUG] Error creating staff record:`, staffError);
                    return res.status(500).json({
                        message: "Error creating staff record",
                        error: staffError instanceof Error
                            ? staffError.message
                            : "Unknown error",
                    });
                }
            }
            else {
                console.log(`[AUTH DEBUG] Found existing staff record: ${existingStaff._id}`);
                // Ensure userId is correct format
                if (existingStaff.userId.toString() !== user._id.toString()) {
                    existingStaff.userId = new mongoose_1.Types.ObjectId(user._id.toString());
                    yield existingStaff.save();
                    console.log(`[AUTH DEBUG] Updated staff record userId to: ${user._id}`);
                }
            }
        }
        // Create properly typed token payload
        const tokenPayload = {
            _id: user._id.toString(),
            userId: user._id.toString(),
            username: user.username,
            role: user.role,
            name: user.name || undefined,
        };
        const token = jsonwebtoken_1.default.sign(tokenPayload, config_1.config.jwtSecret, {
            expiresIn: "24h",
        });
        console.log(`[AUTH DEBUG] Login successful for user: ${username}`);
        res.json({
            token,
            user: {
                _id: user._id.toString(),
                username: user.username,
                role: user.role,
                name: user.name,
            },
        });
    }
    catch (error) {
        console.error("[AUTH DEBUG] Login error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.login = login;
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password, role, name } = req.body;
        const existingUser = yield User_1.User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "Username already exists" });
        }
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        // Create user with proper type casting
        const user = (yield User_1.User.create({
            username,
            password: hashedPassword,
            role: role || "staff",
            name,
        }));
        // Create properly typed token payload
        const tokenPayload = {
            _id: user._id.toString(),
            userId: user._id.toString(),
            username: user.username,
            role: user.role,
            name: user.name,
        };
        const token = jsonwebtoken_1.default.sign(tokenPayload, config_1.config.jwtSecret, {
            expiresIn: "24h",
        });
        res.status(201).json({
            token,
            user: {
                _id: user._id.toString(),
                username: user.username,
                role: user.role,
                name: user.name,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});
exports.register = register;
