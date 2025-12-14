import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const setUserRole = onCall(async (request) => {
    // Check if the caller is an admin.
    if (request.auth?.token.role !== 'admin') {
        logger.error("Request to set role without admin privileges", { auth: request.auth });
        throw new HttpsError('permission-denied', 'Only admins can set user roles.');
    }

    const userId = request.data.userId;
    const newRole = request.data.newRole;

    if (!userId || !newRole) {
        throw new HttpsError('invalid-argument', 'The function must be called with "userId" and "newRole" arguments.');
    }

    try {
        await admin.auth().setCustomUserClaims(userId, { role: newRole });
        // Also update the role in Firestore for client-side access
        await admin.firestore().collection('users').doc(userId).update({ role: newRole });

        logger.info(`Successfully set role for user ${userId} to ${newRole}.`);
        return { success: true, message: `Role for ${userId} set to ${newRole}.` };
    } catch (error: any) {
        logger.error(`Error setting role for user ${userId}:`, error);
        throw new HttpsError('internal', `Failed to set role: ${error.message}`);
    }
});
