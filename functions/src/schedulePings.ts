import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { performPing } from "./ping"; // Import the reusable performPing function
import { PingSite } from "./interface"; // Import PingSite interface

// Initialize Firebase Admin SDK (only once)
initializeApp();
const db = getFirestore();

// Define frequency in minutes for easier calculation
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

// This function runs every minute for fine-grained control.
export const schedulePings = onSchedule("every 1 minutes", async (event) => {
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

        const pingPromises: Promise<any>[] = [];

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            const pingedSites: PingSite[] = userData.pingedSites || [];

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
                } else { // For frequencies greater than 1 hour
                    const minutesIntoDay = currentHour * 60 + currentMinute;
                    shouldPing = minutesIntoDay % siteFrequency === 0;
                }

                if (shouldPing) {
                    logger.info(`Pinging ${site.url} for user ${userId} based on frequency '${site.frequency}'`);
                    
                    const pingPromise = performPing(site.url).then(result => {
                        const resultToSave = { ...result, userId: userId };
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
        } else {
            logger.info("No sites were due for a ping on this run.");
        }

    } catch (error: any) {
        logger.error("Error in scheduled pings outer block:", error, { structuredData: true });
    }
});

