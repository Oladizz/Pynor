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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ping = void 0;
exports.performPing = performPing;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Performs an HTTP/HTTPS ping to the target URL with strict timeout and resilience.
 * @param targetUrl The URL to ping.
 * @param timeoutMs Timeout in milliseconds (default: 15000ms).
 * @returns A PingResult object.
 */
async function performPing(targetUrl, timeoutMs = 15000) {
    var _a;
    logger.info(`Performing ping for ${targetUrl}`, { structuredData: true });
    let formattedUrl = targetUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = `https://${formattedUrl}`;
    }
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(formattedUrl, {
            signal: controller.signal,
            redirect: 'follow',
            headers: {
                'User-Agent': 'Pynor-Uptime-Monitor/2.0 (Oladizz Agency; +https://oladizz.xyz)',
            },
        });
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        const isOnline = res.ok; // 200-299 status codes
        return {
            id: crypto.randomUUID(),
            url: targetUrl,
            status: isOnline ? "Online" : "Offline",
            responseTime: responseTime,
            statusCode: res.status,
            statusText: res.statusText || (isOnline ? "OK" : `HTTP ${res.status}`),
            timestamp: new Date(),
        };
    }
    catch (error) {
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        const isTimeout = error.name === 'AbortError' || ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('aborted'));
        const errorMessage = isTimeout
            ? `Request timed out after ${timeoutMs / 1000}s`
            : (error.message || "Network connection failure");
        logger.warn(`Error pinging ${targetUrl}: ${errorMessage}`, { structuredData: true });
        return {
            id: crypto.randomUUID(),
            url: targetUrl,
            status: "Error",
            responseTime: responseTime,
            statusCode: null,
            statusText: errorMessage,
            timestamp: new Date(),
        };
    }
}
exports.ping = (0, https_1.onCall)(async (request) => {
    var _a;
    const targetUrl = (_a = request.data) === null || _a === void 0 ? void 0 : _a.url;
    if (!targetUrl || typeof targetUrl !== "string") {
        logger.warn("Ping request missing target URL", { structuredData: true });
        throw new https_1.HttpsError("invalid-argument", "The function must be called with a 'url' string parameter.");
    }
    const pingResult = await performPing(targetUrl);
    return pingResult;
});
//# sourceMappingURL=ping.js.map