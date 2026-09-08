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
exports.dispatchTelegramAlert = dispatchTelegramAlert;
exports.dispatchWebhookAlert = dispatchWebhookAlert;
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Dispatches a downtime or recovery alert directly to Telegram
 */
async function dispatchTelegramAlert(botToken, chatId, payload) {
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
    }
    else {
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
    }
    catch (err) {
        logger.error(`Error sending Telegram alert for ${payload.siteUrl}: ${err.message}`);
        return false;
    }
}
/**
 * Dispatches a structured webhook alert (compatible with Discord, Slack, or custom webhooks)
 */
async function dispatchWebhookAlert(webhookUrl, payload) {
    const isDown = payload.eventType === "downtime";
    const body = {
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
    }
    catch (err) {
        logger.error(`Error sending Webhook alert for ${payload.siteUrl}: ${err.message}`);
        return false;
    }
}
//# sourceMappingURL=notifications.js.map