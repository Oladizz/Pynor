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
exports.schedulePings = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const ping_1 = require("./ping"); // Import the reusable performPing function
// Initialize Firebase Admin SDK (only once)
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
// Define frequency in minutes for easier calculation
const frequencyInMinutes = {
    "1min": 1,
    "5min": 5,
    "15min": 15,
    "30min": 30,
    "1hr": 60,
    "6hr": 360,
    "12hr": 720,
    "24hr": 1440,
};
// This function runs every minute for fine-grained control.
exports.schedulePings = (0, scheduler_1.onSchedule)("every 1 minutes", async (event) => {
    const now = new Date();
    const currentMinute = now.getMinutes();
    const currentHour = now.getHours();
    logger.info(`Running scheduled pings at minute ${currentMinute}...`, { structuredData: true });
    try {
        const usersRef = db.collection('users');
        const usersSnapshot = await usersRef.get();
        if (usersSnapshot.empty) {
            logger.info("No users found to schedule pings for.", { structuredData: true });
            return;
        }
        const pingPromises = [];
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            const pingedSites = userData.pingedSites || [];
            for (const site of pingedSites) {
                const siteFrequency = frequencyInMinutes[site.frequency];
                if (!siteFrequency) {
                    logger.warn(`Unknown frequency '${site.frequency}' for site ${site.url}. Skipping.`);
                    continue;
                }
                // Check if the site is due for a ping
                let shouldPing = false;
                if (siteFrequency <= 60) { // For frequencies up to 1 hour
                    shouldPing = currentMinute % siteFrequency === 0;
                }
                else { // For frequencies greater than 1 hour
                    const minutesIntoDay = currentHour * 60 + currentMinute;
                    shouldPing = minutesIntoDay % siteFrequency === 0;
                }
                if (shouldPing) {
                    logger.info(`Pinging ${site.url} for user ${userId} based on frequency '${site.frequency}'`);
                    const pingPromise = (0, ping_1.performPing)(site.url).then(result => {
                        const resultToSave = Object.assign(Object.assign({}, result), { userId: userId });
                        const pingResultRef = db.collection('ping_results');
                        return pingResultRef.add(resultToSave);
                    }).catch(error => {
                        logger.error(`Error in performPing for ${site.url}:`, error);
                    });
                    pingPromises.push(pingPromise);
                }
            }
        }
        await Promise.all(pingPromises);
        if (pingPromises.length > 0) {
            logger.info(`Scheduled pings initiated. Total pings: ${pingPromises.length}`, { structuredData: true });
        }
        else {
            logger.info("No sites were due for a ping on this run.");
        }
    }
    catch (error) {
        logger.error("Error in scheduled pings outer block:", error, { structuredData: true });
    }
});
//# sourceMappingURL=schedulePings.js.map