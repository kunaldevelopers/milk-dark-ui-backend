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
exports.User = void 0;
const mongoose_1 = require("mongoose");
const bcrypt_1 = __importDefault(require("bcrypt"));
const Settings_1 = require("./Settings");
const userSchema = new mongoose_1.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    contactNumber: String,
    location: String,
    profilePhoto: String,
}, {
    timestamps: true,
});
// Add method to compare passwords
userSchema.methods.comparePassword = function (candidatePassword) {
    return __awaiter(this, void 0, void 0, function* () {
        return bcrypt_1.default.compare(candidatePassword, this.password);
    });
};
// Add validation for roles
userSchema.pre("validate", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Validate role against settings
            const roles = yield (0, Settings_1.getSetting)("roles");
            if (roles && Array.isArray(roles) && !roles.includes(this.role)) {
                const err = new Error(`Role must be one of: ${roles.join(", ")}`);
                return next(err);
            }
            next();
        }
        catch (error) {
            // Cast error to CallbackError type for Mongoose middleware
            next(error);
        }
    });
});
exports.User = (0, mongoose_1.model)("User", userSchema);
