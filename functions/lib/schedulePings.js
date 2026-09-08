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
const ping_1 = require("./ping");
const notifications_1 = require("./notifications");
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)();
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
/**
 * Handles incident creation, resolution, and alert dispatching based on state transition.
 */
async function handleIncidentAndAlerts(userId, site, result) {
    var _a, _b, _c;
    const isDown = result.status !== "Online";
    const incidentsRef = db.collection("incidents");
    try {
        const ongoingQuery = await incidentsRef
            .where("userId", "==", userId)
            .where("siteUrl", "==", site.url)
            .where("status", "==", "ongoing")
            .limit(1)
            .get();
        const hasOngoingIncident = !ongoingQuery.empty;
        if (isDown && !hasOngoingIncident) {
            // New outage detected -> Open Incident & Dispatch Alert
            logger.warn(`Downtime detected for ${site.url} (User: ${userId})`);
            await incidentsRef.add({
                userId,
                siteUrl: site.url,
                siteName: site.name || site.url,
                status: "ongoing",
                startedAt: firestore_1.Timestamp.now(),
                resolvedAt: null,
                cause: result.statusText || `HTTP ${result.statusCode || "Unavailable"}`,
                statusCode: result.statusCode || null,
            });
            if ((_a = site.alertConfig) === null || _a === void 0 ? void 0 : _a.enabled) {
                const payload = {
                    siteUrl: site.url,
                    siteName: site.name,
                    eventType: "downtime",
                    reason: result.statusText || "Site is unreachable",
                    statusCode: result.statusCode,
                    timestamp: new Date(),
                };
                if (site.alertConfig.telegramBotToken && site.alertConfig.telegramChatId) {
                    await (0, notifications_1.dispatchTelegramAlert)(site.alertConfig.telegramBotToken, site.alertConfig.telegramChatId, payload);
                }
                if (site.alertConfig.webhookUrl) {
                    await (0, notifications_1.dispatchWebhookAlert)(site.alertConfig.webhookUrl, payload);
                }
            }
        }
        else if (!isDown && hasOngoingIncident) {
            // Recovery detected -> Resolve Incident & Dispatch Alert
            logger.info(`Recovery detected for ${site.url} (User: ${userId})`);
            const incidentDoc = ongoingQuery.docs[0];
            const incidentData = incidentDoc.data();
            const startedAtMillis = ((_b = incidentData.startedAt) === null || _b === void 0 ? void 0 : _b.toMillis()) || Date.now();
            const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtMillis) / 1000));
            await incidentDoc.ref.update({
                status: "resolved",
                resolvedAt: firestore_1.Timestamp.now(),
                durationSeconds,
            });
            if ((_c = site.alertConfig) === null || _c === void 0 ? void 0 : _c.enabled) {
                const payload = {
                    siteUrl: site.url,
                    siteName: site.name,
                    eventType: "recovery",
                    reason: "Service restored",
                    statusCode: result.statusCode,
                    timestamp: new Date(),
                    durationSeconds,
                };
                if (site.alertConfig.telegramBotToken && site.alertConfig.telegramChatId) {
                    await (0, notifications_1.dispatchTelegramAlert)(site.alertConfig.telegramBotToken, site.alertConfig.telegramChatId, payload);
                }
                if (site.alertConfig.webhookUrl) {
                    await (0, notifications_1.dispatchWebhookAlert)(site.alertConfig.webhookUrl, payload);
                }
            }
        }
    }
    catch (err) {
        logger.error(`Error processing incidents/alerts for ${site.url}: ${err.message}`);
    }
}
/**
 * Scheduled function running every minute to monitor sites
 */
exports.schedulePings = (0, scheduler_1.onSchedule)("every 1 minutes", async () => {
    const now = new Date();
    const currentMinute = now.getMinutes();
    const currentHour = now.getHours();
    logger.info(`Running scheduled pings at minute ${currentMinute}...`, { structuredData: true });
    try {
        const usersRef = db.collection("users");
        const usersSnapshot = await usersRef.get();
        if (usersSnapshot.empty) {
            logger.info("No users found to schedule pings for.");
            return;
        }
        const pingPromises = [];
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            const pingedSites = userData.pingedSites || [];
            let sitesUpdated = false;
            for (const site of pingedSites) {
                const siteFrequency = frequencyInMinutes[site.frequency] || 5;
                let shouldPing = false;
                if (siteFrequency <= 60) {
                    shouldPing = currentMinute % siteFrequency === 0;
                }
                else {
                    const minutesIntoDay = currentHour * 60 + currentMinute;
                    shouldPing = minutesIntoDay % siteFrequency === 0;
                }
                if (shouldPing) {
                    logger.info(`Pinging ${site.url} for user ${userId} (freq: ${site.frequency})`);
                    const pingPromise = (0, ping_1.performPing)(site.url)
                        .then(async (result) => {
                        // 1. Store ping result
                        await db.collection("ping_results").add(Object.assign(Object.assign({}, result), { userId }));
                        // 2. Process incident and alerts
                        await handleIncidentAndAlerts(userId, site, result);
                        // 3. Update cached status on site object
                        site.lastStatus = result.status;
                        site.lastCheckedAt = new Date().toISOString();
                        sitesUpdated = true;
                    })
                        .catch((error) => {
                        logger.error(`Error in scheduled ping execution for ${site.url}:`, error);
                    });
                    pingPromises.push(pingPromise);
                }
            }
            if (sitesUpdated) {
                await userDoc.ref.update({ pingedSites });
            }
        }
        await Promise.all(pingPromises);
        logger.info(`Scheduled pings completed. Total checked: ${pingPromises.length}`);
    }
    catch (error) {
        logger.error("Error in scheduled pings outer block:", error, { structuredData: true });
    }
});
//# sourceMappingURL=schedulePings.js.map