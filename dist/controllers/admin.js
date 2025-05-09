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
exports.changePassword = exports.deleteAdmin = exports.addAdmin = exports.getAllAdmins = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const User_1 = require("../models/User");
const getAllAdmins = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admins = yield User_1.User.find({ role: "admin" })
            .select("-password")
            .lean();
        // Transform the data to match frontend expectations
        const transformedAdmins = admins.map((admin) => ({
            _id: admin._id,
            name: admin.name,
            email: admin.username, // Map username to email for frontend
            role: admin.role,
        }));
        res.json(transformedAdmins);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch admins" });
    }
});
exports.getAllAdmins = getAllAdmins;
const addAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password } = req.body;
        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const existingUser = yield User_1.User.findOne({ username: email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" });
        }
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        const admin = yield User_1.User.create({
            username: email, // Use email as username
            password: hashedPassword,
            name: name,
            role: "admin",
        });
        const adminResponse = {
            _id: admin._id,
            name: admin.name,
            email: admin.username,
            role: admin.role,
        };
        res.status(201).json(adminResponse);
    }
    catch (error) {
        console.error("Add admin error:", error);
        res.status(500).json({ message: "Failed to add admin" });
    }
});
exports.addAdmin = addAdmin;
const deleteAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Prevent deleting the last admin
        const adminCount = yield User_1.User.countDocuments({ role: "admin" });
        if (adminCount <= 1) {
            return res.status(400).json({ message: "Cannot delete the last admin" });
        }
        const admin = yield User_1.User.findByIdAndDelete(id);
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }
        res.json({ message: "Admin deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to delete admin" });
    }
});
exports.deleteAdmin = deleteAdmin;
const changePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.userId;
        const user = yield User_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const isValidPassword = yield bcrypt_1.default.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }
        const hashedPassword = yield bcrypt_1.default.hash(newPassword, 10);
        user.password = hashedPassword;
        yield user.save();
        res.json({ message: "Password changed successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to change password" });
    }
});
exports.changePassword = changePassword;
