import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import fetch from "node-fetch";
import { PingResult, PingStatus } from "./interface"; // Import PingResult and PingStatus



/**
 * Performs an HTTP ping to the target URL and returns PingResult.
 * This function is reusable by both HTTP trigger and scheduled functions.
 * @param targetUrl The URL to ping.
 * @returns A PingResult object.
 */
export async function performPing(targetUrl: string): Promise<PingResult> {
    logger.info(`Performing ping for ${targetUrl}`, { structuredData: true });

    const startTime = Date.now();
    let pingResult: PingResult;

    try {
        const res = await fetch(targetUrl, { redirect: 'follow' }); // Follow redirects
        const responseTime = Date.now() - startTime;
        pingResult = {
            id: crypto.randomUUID(), // Generate a unique ID for each ping result
            url: targetUrl,
            status: res.ok ? "Online" : "Offline" as PingStatus,
            responseTime: responseTime,
            statusCode: res.status,
            statusText: res.statusText,
            timestamp: new Date(),
        };
    } catch (error: any) {
        const responseTime = Date.now() - startTime;
        logger.error(
            `Error pinging ${targetUrl}: ${error.message}`,
            { structuredData: true },
        );
        pingResult = {
            id: crypto.randomUUID(), // Generate a unique ID for each ping result
            url: targetUrl,
            status: "Error" as PingStatus,
            responseTime: responseTime, // Still capture response time even on error if request was sent
            statusCode: null,
            statusText: error.message,
            timestamp: new Date(),
        };
    }
    return pingResult;
}


export const ping = onCall(async (request) => {
  const targetUrl = request.data.url;

  if (!targetUrl) {
    logger.warn("Ping request missing target URL", { structuredData: true });
    throw new HttpsError("invalid-argument", "The function must be called with " +
        "one arguments, 'url', containing the URL to ping.");
  }

  // Use the refactored performPing function
  const pingResult = await performPing(targetUrl);

  return pingResult;
});
