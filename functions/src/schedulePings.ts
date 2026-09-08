import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { performPing } from "./ping";
import { PingSite, PingResult } from "./interface";
import { dispatchTelegramAlert, dispatchWebhookAlert } from "./notifications";

if (getApps().length === 0) {
    initializeApp();
}
const db = getFirestore();

const frequencyInMinutes: Record<string, number> = {
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
async function handleIncidentAndAlerts(
    userId: string,
    site: PingSite,
    result: PingResult
) {
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
                startedAt: Timestamp.now(),
                resolvedAt: null,
                cause: result.statusText || `HTTP ${result.statusCode || "Unavailable"}`,
                statusCode: result.statusCode || null,
            });

            if (site.alertConfig?.enabled) {
                const payload = {
                    siteUrl: site.url,
                    siteName: site.name,
                    eventType: "downtime" as const,
                    reason: result.statusText || "Site is unreachable",
                    statusCode: result.statusCode,
                    timestamp: new Date(),
                };

                if (site.alertConfig.telegramBotToken && site.alertConfig.telegramChatId) {
                    await dispatchTelegramAlert(
                        site.alertConfig.telegramBotToken,
                        site.alertConfig.telegramChatId,
                        payload
                    );
                }

                if (site.alertConfig.webhookUrl) {
                    await dispatchWebhookAlert(site.alertConfig.webhookUrl, payload);
                }
            }
        } else if (!isDown && hasOngoingIncident) {
            // Recovery detected -> Resolve Incident & Dispatch Alert
            logger.info(`Recovery detected for ${site.url} (User: ${userId})`);

            const incidentDoc = ongoingQuery.docs[0];
            const incidentData = incidentDoc.data();
            const startedAtMillis = incidentData.startedAt?.toMillis() || Date.now();
            const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtMillis) / 1000));

            await incidentDoc.ref.update({
                status: "resolved",
                resolvedAt: Timestamp.now(),
                durationSeconds,
            });

            if (site.alertConfig?.enabled) {
                const payload = {
                    siteUrl: site.url,
                    siteName: site.name,
                    eventType: "recovery" as const,
                    reason: "Service restored",
                    statusCode: result.statusCode,
                    timestamp: new Date(),
                    durationSeconds,
                };

                if (site.alertConfig.telegramBotToken && site.alertConfig.telegramChatId) {
                    await dispatchTelegramAlert(
                        site.alertConfig.telegramBotToken,
                        site.alertConfig.telegramChatId,
                        payload
                    );
                }

                if (site.alertConfig.webhookUrl) {
                    await dispatchWebhookAlert(site.alertConfig.webhookUrl, payload);
                }
            }
        }
    } catch (err: any) {
        logger.error(`Error processing incidents/alerts for ${site.url}: ${err.message}`);
    }
}

/**
 * Scheduled function running every minute to monitor sites
 */
export const schedulePings = onSchedule("every 1 minutes", async () => {
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

        const pingPromises: Promise<any>[] = [];

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            const pingedSites: PingSite[] = userData.pingedSites || [];
            let sitesUpdated = false;

            for (const site of pingedSites) {
                const siteFrequency = frequencyInMinutes[site.frequency] || 5;

                let shouldPing = false;
                if (siteFrequency <= 60) {
                    shouldPing = currentMinute % siteFrequency === 0;
                } else {
                    const minutesIntoDay = currentHour * 60 + currentMinute;
                    shouldPing = minutesIntoDay % siteFrequency === 0;
                }

                if (shouldPing) {
                    logger.info(`Pinging ${site.url} for user ${userId} (freq: ${site.frequency})`);

                    const pingPromise = performPing(site.url)
                        .then(async (result) => {
                            // 1. Store ping result
                            await db.collection("ping_results").add({
                                ...result,
                                userId,
                            });

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
    } catch (error: any) {
        logger.error("Error in scheduled pings outer block:", error, { structuredData: true });
    }
});
