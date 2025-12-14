"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ping = void 0;
exports.performPing = performPing;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const node_fetch_1 = __importDefault(require("node-fetch"));
/**
 * Performs an HTTP ping to the target URL and returns PingResult.
 * This function is reusable by both HTTP trigger and scheduled functions.
 * @param targetUrl The URL to ping.
 * @returns A PingResult object.
 */
async function performPing(targetUrl) {
    logger.info(`Performing ping for ${targetUrl}`, { structuredData: true });
    const startTime = Date.now();
    let pingResult;
    try {
        const res = await (0, node_fetch_1.default)(targetUrl, { redirect: 'follow' }); // Follow redirects
        const responseTime = Date.now() - startTime;
        pingResult = {
            id: crypto.randomUUID(), // Generate a unique ID for each ping result
            url: targetUrl,
            status: res.ok ? "Online" : "Offline",
            responseTime: responseTime,
            statusCode: res.status,
            statusText: res.statusText,
            timestamp: new Date(),
        };
    }
    catch (error) {
        const responseTime = Date.now() - startTime;
        logger.error(`Error pinging ${targetUrl}: ${error.message}`, { structuredData: true });
        pingResult = {
            id: crypto.randomUUID(), // Generate a unique ID for each ping result
            url: targetUrl,
            status: "Error",
            responseTime: responseTime, // Still capture response time even on error if request was sent
            statusCode: null,
            statusText: error.message,
            timestamp: new Date(),
        };
    }
    return pingResult;
}
exports.ping = (0, https_1.onCall)(async (request) => {
    const targetUrl = request.data.url;
    if (!targetUrl) {
        logger.warn("Ping request missing target URL", { structuredData: true });
        throw new https_1.HttpsError("invalid-argument", "The function must be called with " +
            "one arguments, 'url', containing the URL to ping.");
    }
    // Use the refactored performPing function
    const pingResult = await performPing(targetUrl);
    return pingResult;
});
//# sourceMappingURL=ping.js.map