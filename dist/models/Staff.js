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
exports.Staff = void 0;
const mongoose_1 = require("mongoose");
const staffSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    contactNumber: String,
    location: String,
    // shift field removed - now using StaffSession model for shift tracking
    assignedClients: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Client" }],
    totalMilkQuantity: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
    lastDeliveryDate: Date,
}, {
    timestamps: true, // This will add createdAt and updatedAt fields automatically
});
staffSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.isModified("assignedClients")) {
            const Client = (0, mongoose_1.model)("Client");
            const clients = yield Client.find({ _id: { $in: this.assignedClients } });
            this.totalMilkQuantity = clients.reduce((total, client) => total + client.quantity, 0);
        }
        next();
    });
});
exports.Staff = (0, mongoose_1.model)("Staff", staffSchema);
