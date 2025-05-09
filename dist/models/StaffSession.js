"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffSession = void 0;
const mongoose_1 = require("mongoose");
const staffSessionSchema = new mongoose_1.Schema({
    staffId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Staff", required: true },
    shift: { type: String, enum: ["AM", "PM"], required: true },
    date: {
        type: Date,
        required: true,
        default: () => new Date().setHours(0, 0, 0, 0),
    },
}, {
    timestamps: true,
});
// Create a compound index on staffId and date to ensure uniqueness per day
staffSessionSchema.index({ staffId: 1, date: 1 }, { unique: true });
console.log("StaffSession model created for tracking daily shift selections");
exports.StaffSession = (0, mongoose_1.model)("StaffSession", staffSessionSchema);
// Step 2 implemented: Created StaffSession model
