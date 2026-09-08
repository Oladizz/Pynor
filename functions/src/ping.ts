import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { PingResult, PingStatus } from "./interface";

/**
 * Performs an HTTP/HTTPS ping to the target URL with strict timeout and resilience.
 * @param targetUrl The URL to ping.
 * @param timeoutMs Timeout in milliseconds (default: 15000ms).
 * @returns A PingResult object.
 */
export async function performPing(targetUrl: string, timeoutMs: number = 15000): Promise<PingResult> {
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
            status: isOnline ? ("Online" as PingStatus) : ("Offline" as PingStatus),
            responseTime: responseTime,
            statusCode: res.status,
            statusText: res.statusText || (isOnline ? "OK" : `HTTP ${res.status}`),
            timestamp: new Date(),
        };
    } catch (error: any) {
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        const isTimeout = error.name === 'AbortError' || error.message?.includes('aborted');
        const errorMessage = isTimeout
            ? `Request timed out after ${timeoutMs / 1000}s`
            : (error.message || "Network connection failure");

        logger.warn(`Error pinging ${targetUrl}: ${errorMessage}`, { structuredData: true });

        return {
            id: crypto.randomUUID(),
            url: targetUrl,
            status: "Error" as PingStatus,
            responseTime: responseTime,
            statusCode: null,
            statusText: errorMessage,
            timestamp: new Date(),
        };
    }
}

export const ping = onCall(async (request) => {
    const targetUrl = request.data?.url;

    if (!targetUrl || typeof targetUrl !== "string") {
        logger.warn("Ping request missing target URL", { structuredData: true });
        throw new HttpsError(
            "invalid-argument",
            "The function must be called with a 'url' string parameter."
        );
    }

    const pingResult = await performPing(targetUrl);
    return pingResult;
});
