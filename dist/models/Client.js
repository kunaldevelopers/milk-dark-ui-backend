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
exports.Client = void 0;
const mongoose_1 = require("mongoose");
const Settings_1 = require("./Settings");
const deliveryRecordSchema = new mongoose_1.Schema({
    date: { type: Date, required: true },
    status: {
        type: String,
        enum: ["Delivered", "Not Delivered"],
        required: true,
    },
    quantity: { type: Number, required: true },
    reason: String,
});
const billingInfoSchema = new mongoose_1.Schema({
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    totalQuantity: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    isPaid: { type: Boolean, default: false },
});
// Create the schema with dynamic validation
const clientSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    number: { type: String, required: true },
    location: { type: String, required: true },
    timeShift: {
        type: String,
        enum: ["AM", "PM"],
        required: true,
    },
    pricePerLitre: { type: Number, required: true },
    quantity: { type: Number, required: true },
    priorityStatus: { type: Boolean, default: false },
    assignedStaff: { type: mongoose_1.Schema.Types.ObjectId, ref: "Staff" },
    deliveryStatus: {
        type: String,
        enum: ["Pending", "Delivered", "Not Delivered"],
        default: "Pending",
    },
    deliveryHistory: [deliveryRecordSchema],
    monthlyBilling: billingInfoSchema,
    deliveryNotes: { type: String },
}, {
    timestamps: true,
});
// Add dynamic validation before save
clientSchema.pre("validate", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Validate timeShift against settings
            const shifts = yield (0, Settings_1.getSetting)("shifts");
            if (shifts && Array.isArray(shifts) && !shifts.includes(this.timeShift)) {
                const err = new Error(`TimeShift must be one of: ${shifts.join(", ")}`);
                return next(err);
            }
            // Validate deliveryStatus against settings
            const statuses = yield (0, Settings_1.getSetting)("deliveryStatuses");
            if (statuses &&
                Array.isArray(statuses) &&
                !statuses.includes(this.deliveryStatus)) {
                const err = new Error(`DeliveryStatus must be one of: ${statuses.join(", ")}`);
                return next(err);
            }
            next();
        }
        catch (error) {
            if (error instanceof Error) {
                next(error);
            }
            else {
                next(new Error("An unknown error occurred"));
            }
        }
    });
});
exports.Client = (0, mongoose_1.model)("Client", clientSchema);
