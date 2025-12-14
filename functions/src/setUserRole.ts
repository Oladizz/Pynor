import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const setUserRole = onCall(async (request) => {
    // A user can only make themselves an admin with this development button.
    // For general role management, the original admin check should be used.
    if (request.auth?.uid !== request.data.userId || request.data.newRole !== 'admin') {
        logger.error("Request to set role with invalid permissions", { auth: request.auth, data: request.data });
        throw new HttpsError('permission-denied', 'You can only make yourself an admin.');
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
