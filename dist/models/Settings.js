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
exports.initializeDefaultSettings = exports.defaultSettings = exports.getSetting = exports.SystemSettings = void 0;
const mongoose_1 = require("mongoose");
// Schema for system settings
const systemSettingsSchema = new mongoose_1.Schema({
    settingKey: { type: String, required: true, unique: true },
    settingValue: { type: mongoose_1.Schema.Types.Mixed, required: true },
    description: { type: String },
    category: { type: String, required: true },
    isActive: { type: Boolean, default: true },
}, {
    timestamps: true,
});
// Create model
exports.SystemSettings = (0, mongoose_1.model)("SystemSettings", systemSettingsSchema);
// Helper function to get settings by key
const getSetting = (key) => __awaiter(void 0, void 0, void 0, function* () {
    const setting = yield exports.SystemSettings.findOne({
        settingKey: key,
        isActive: true,
    });
    return setting ? setting.settingValue : null;
});
exports.getSetting = getSetting;
// Default settings
exports.defaultSettings = {
    shifts: ["AM", "PM"],
    roles: ["admin", "staff"],
    defaultRole: "staff",
    defaultShift: "AM",
    deliveryStatuses: ["Delivered", "Not Delivered", "Pending"],
    // ...any other settings
};
// Helper function to initialize default system settings
const initializeDefaultSettings = () => __awaiter(void 0, void 0, void 0, function* () {
    // Define default settings
    const defaultSettings = [
        {
            settingKey: "shifts",
            settingValue: ["AM", "PM"],
            description: "Available shift options",
            category: "delivery",
        },
        {
            settingKey: "deliveryStatuses",
            settingValue: ["Pending", "Delivered", "Not Delivered"],
            description: "Available delivery status options",
            category: "delivery",
        },
        {
            settingKey: "roles",
            settingValue: ["admin", "staff"],
            description: "User roles in the system",
            category: "user",
        },
        {
            settingKey: "defaultShift",
            settingValue: "AM",
            description: "Default shift for new staff",
            category: "delivery",
        },
        {
            settingKey: "defaultRole",
            settingValue: "staff",
            description: "Default role for new users",
            category: "user",
        },
    ];
    // Check and insert each setting if it doesn't exist
    for (const setting of defaultSettings) {
        const exists = yield exports.SystemSettings.findOne({
            settingKey: setting.settingKey,
        });
        if (!exists) {
            yield exports.SystemSettings.create(setting);
            console.log(`Created setting: ${setting.settingKey}`);
        }
    }
    console.log("✓ Default system settings initialized");
});
exports.initializeDefaultSettings = initializeDefaultSettings;
