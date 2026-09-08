import * as logger from "firebase-functions/logger";

export interface AlertPayload {
    siteUrl: string;
    siteName?: string;
    eventType: "downtime" | "recovery";
    reason?: string;
    statusCode?: number | null;
    timestamp: Date;
    durationSeconds?: number;
}

/**
 * Dispatches a downtime or recovery alert directly to Telegram
 */
export async function dispatchTelegramAlert(
    botToken: string,
    chatId: string,
    payload: AlertPayload
): Promise<boolean> {
    const isDown = payload.eventType === "downtime";
    const emoji = isDown ? "🚨" : "✅";
    const statusText = isDown ? "DOWNTIME DETECTED" : "SERVICE RECOVERED";

    let message = `${emoji} *[Pynor Alert] ${statusText}*\n\n`;
    message += `*Target:* \`${payload.siteUrl}\`\n`;
    if (payload.siteName) {
        message += `*Name:* ${payload.siteName}\n`;
    }
    message += `*Time:* ${payload.timestamp.toUTCString()}\n`;

    if (isDown) {
        message += `*Cause:* ${payload.reason || "Unreachable"}\n`;
        if (payload.statusCode) {
            message += `*HTTP Code:* ${payload.statusCode}\n`;
        }
    } else {
        const mins = payload.durationSeconds ? Math.max(1, Math.round(payload.durationSeconds / 60)) : 1;
        message += `*Total Downtime:* ~${mins} minute(s)\n`;
    }

    message += `\n_Monitored by Pynor • Oladizz Agency_`;

    try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: "Markdown",
            }),
        });

        if (!res.ok) {
            const errBody = await res.text();
            logger.warn(`Telegram alert failed for ${payload.siteUrl}: HTTP ${res.status} - ${errBody}`);
            return false;
        }
        return true;
    } catch (err: any) {
        logger.error(`Error sending Telegram alert for ${payload.siteUrl}: ${err.message}`);
        return false;
    }
}

/**
 * Dispatches a structured webhook alert (compatible with Discord, Slack, or custom webhooks)
 */
export async function dispatchWebhookAlert(
    webhookUrl: string,
    payload: AlertPayload
): Promise<boolean> {
    const isDown = payload.eventType === "downtime";
    const body: Record<string, any> = {
        app: "Pynor",
        source: "Oladizz Agency",
        eventType: payload.eventType,
        siteUrl: payload.siteUrl,
        siteName: payload.siteName || payload.siteUrl,
        status: isDown ? "DOWN" : "UP",
        reason: payload.reason || (isDown ? "Unreachable" : "Service recovered"),
        statusCode: payload.statusCode || null,
        timestamp: payload.timestamp.toISOString(),
        durationSeconds: payload.durationSeconds || 0,
    };

    // If it's a Discord webhook, format with embed
    if (webhookUrl.includes("discord.com/api/webhooks")) {
        body.content = isDown ? "🚨 **[Pynor Alert] Site is DOWN!**" : "✅ **[Pynor Alert] Site is Back Online!**";
        body.embeds = [
            {
                title: payload.siteUrl,
                color: isDown ? 0xff0033 : 0x00ff66,
                fields: [
                    { name: "Status", value: isDown ? "DOWN" : "UP", inline: true },
                    { name: "HTTP Code", value: `${payload.statusCode || "N/A"}`, inline: true },
                    { name: "Details", value: payload.reason || (isDown ? "No response" : "Service restored") },
                ],
                footer: { text: "Pynor • Oladizz Agency" },
                timestamp: payload.timestamp.toISOString(),
            },
        ];
    }

    try {
        const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        return res.ok;
    } catch (err: any) {
        logger.error(`Error sending Webhook alert for ${payload.siteUrl}: ${err.message}`);
        return false;
    }
}
