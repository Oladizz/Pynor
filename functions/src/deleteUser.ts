import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const deleteUser = onCall(async (request) => {
  // Check if the caller is an admin.
  if (request.auth?.token.role !== 'admin') {
    logger.error("Request to delete user without admin privileges", { auth: request.auth });
    throw new HttpsError('permission-denied', 'Only admins can delete users.');
  }

  const userId = request.data.userId;
  if (!userId) {
    throw new HttpsError('invalid-argument', 'The function must be called with a "userId" argument.');
  }

  try {
    // Delete from Firebase Authentication
    await admin.auth().deleteUser(userId);
    logger.info(`Successfully deleted user ${userId} from Firebase Authentication.`);

    // Delete from Firestore
    await admin.firestore().collection('users').doc(userId).delete();
    logger.info(`Successfully deleted user ${userId} document from Firestore.`);

    return { success: true, message: `User ${userId} deleted successfully.` };
  } catch (error: any) {
    logger.error(`Error deleting user ${userId}:`, error);
    throw new HttpsError('internal', `Failed to delete user: ${error.message}`);
  }
});
