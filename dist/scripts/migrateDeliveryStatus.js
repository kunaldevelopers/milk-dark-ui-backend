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
const DailyDelivery_1 = require("../models/DailyDelivery");
const Client_1 = require("../models/Client");
const config_1 = require("../config");
const migrateDeliveryStatus = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mongoose_1.default.connect(config_1.config.mongoUri);
        console.log("Connected to MongoDB");
        // First update DailyDelivery records
        console.log("Updating DailyDelivery records...");
        const dailyDeliveryResult = yield DailyDelivery_1.DailyDelivery.updateMany({ deliveryStatus: { $in: ["delivered", "not_delivered"] } }, [
            {
                $set: {
                    deliveryStatus: {
                        $switch: {
                            branches: [
                                {
                                    case: { $eq: ["$deliveryStatus", "delivered"] },
                                    then: "Delivered",
                                },
                                {
                                    case: { $eq: ["$deliveryStatus", "not_delivered"] },
                                    then: "Not Delivered",
                                },
                            ],
                            default: "$deliveryStatus",
                        },
                    },
                },
            },
        ]);
        console.log("Updated DailyDelivery records:", dailyDeliveryResult);
        // Then update Client records
        console.log("Updating Client records...");
        const clientResult = yield Client_1.Client.updateMany({
            deliveryStatus: {
                $in: ["Delivered", "Not Delivered", "delivered", "not_delivered"],
            },
        }, [
            {
                $set: {
                    deliveryStatus: {
                        $switch: {
                            branches: [
                                {
                                    case: { $eq: ["$deliveryStatus", "delivered"] },
                                    then: "Delivered",
                                },
                                {
                                    case: { $eq: ["$deliveryStatus", "not_delivered"] },
                                    then: "Not Delivered",
                                },
                            ],
                            default: "$deliveryStatus",
                        },
                    },
                },
            },
        ]);
        console.log("Updated Client records:", clientResult);
        // Finally update delivery history records
        console.log("Updating delivery history records...");
        const deliveryHistoryResult = yield Client_1.Client.updateMany({
            "deliveryHistory.status": {
                $in: ["delivered", "not_delivered", "Not Delivered"],
            },
        }, [
            {
                $set: {
                    deliveryHistory: {
                        $map: {
                            input: "$deliveryHistory",
                            as: "record",
                            in: {
                                $mergeObjects: [
                                    "$$record",
                                    {
                                        status: {
                                            $switch: {
                                                branches: [
                                                    {
                                                        case: {
                                                            $eq: ["$$record.status", "delivered"],
                                                        },
                                                        then: "Delivered",
                                                    },
                                                    {
                                                        case: {
                                                            $eq: ["$$record.status", "not_delivered"],
                                                        },
                                                        then: "Not Delivered",
                                                    },
                                                ],
                                                default: "$$record.status",
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        ]);
        console.log("Updated delivery history records:", deliveryHistoryResult);
        console.log("Migration completed successfully");
    }
    catch (error) {
        console.error("Migration failed:", error);
    }
    finally {
        yield mongoose_1.default.disconnect();
    }
});
// Run the migration if this script is executed directly
if (require.main === module) {
    migrateDeliveryStatus();
}
