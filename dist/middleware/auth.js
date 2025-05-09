"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const User_1 = require("../models/User");
// Export the middleware function with proper RequestHandler typing
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        console.log("[AUTH DEBUG] No authorization header found");
        res.status(401).json({
            message: "Authentication required",
            details: "No authorization header",
        });
        return;
    }
    if (!authHeader.startsWith("Bearer ")) {
        console.log("[AUTH DEBUG] Invalid authorization format");
        res.status(401).json({
            message: "Authentication failed",
            details: "Invalid token format",
        });
        return;
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        // Find user and attach to request
        User_1.User.findById(decoded._id)
            .then((user) => {
            if (!user) {
                console.log("[AUTH DEBUG] User not found in database");
                res.status(401).json({
                    message: "Authentication failed",
                    details: "User not found",
                });
                return;
            }
            // Convert MongoDB ObjectId to string for consistent typing
            req.user = {
                _id: decoded._id.toString(),
                userId: decoded.userId.toString(),
                username: decoded.username,
                role: decoded.role,
                name: decoded.name,
            };
            next();
        })
            .catch((error) => {
            console.error("[AUTH DEBUG] Database query error:", error);
            res.status(500).json({
                message: "Authentication failed",
                details: "Database error",
            });
        });
    }
    catch (error) {
        console.error("[AUTH DEBUG] Auth middleware error:", error);
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({
                message: "Authentication failed",
                details: "Token has expired",
            });
            return;
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                message: "Authentication failed",
                details: "Invalid token",
            });
            return;
        }
        res.status(401).json({
            message: "Authentication failed",
            details: "Token verification failed",
        });
        return;
    }
};
exports.authMiddleware = authMiddleware;
