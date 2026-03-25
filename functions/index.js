// NOTE: Generate your VAPID key from Firebase Console → Cloud Messaging → Web configuration
// → Generate key pair, then replace PLACEHOLDER_VAPID_KEY in src/contexts/AuthContext.jsx

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

/**
 * Sends an FCM notification to a user by uid.
 * Returns true if sent, false if no token found.
 */
async function sendToUser(uid, title, body) {
  const userDoc = await db.collection("users").doc(uid).get();
  const token = userDoc.data()?.fcmToken;
  if (!token) return false;

  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
    });
    return true;
  } catch (err) {
    // Token is invalid/expired — clean it up
    if (
      err.code === "messaging/invalid-registration-token" ||
      err.code === "messaging/registration-token-not-registered"
    ) {
      await db.collection("users").doc(uid).update({ fcmToken: admin.firestore.FieldValue.delete() });
    }
    functions.logger.error(`FCM send failed for ${uid}:`, err);
    return false;
  }
}

/**
 * Triggered when a new accusation is created.
 * - Notifies the accused user
 * - Notifies all other users that a vote is needed
 */
exports.onAccusationCreated = functions.firestore
  .document("accusations/{accusationId}")
  .onCreate(async (snap) => {
    const data = snap.data();
    const accusedUid = data.accusedUid;
    const submitterUid = data.submitterUid;

    // Notify the accused
    await sendToUser(accusedUid, "🚨 You've been accused!", "Check the app to see what happened");

    // Notify all other users to vote
    const usersSnap = await db.collection("users").get();
    const promises = [];
    usersSnap.forEach((userDoc) => {
      const uid = userDoc.id;
      // Don't notify the accused (already notified) or the submitter (they know)
      if (uid !== accusedUid && uid !== submitterUid) {
        promises.push(
          sendToUser(uid, "🗳️ New accusation", "Your vote is needed — open the app")
        );
      }
    });
    await Promise.all(promises);
  });

/**
 * Triggered when an accusation is updated.
 * If status changed to confirmed/rejected, notify the accused.
 */
exports.onAccusationResolved = functions.firestore
  .document("accusations/{accusationId}")
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only care about status changes
    if (before.status === after.status) return;

    const accusedUid = after.accusedUid;

    if (after.status === "confirmed") {
      const submitterName = after.submitterName || "Someone";
      await sendToUser(
        accusedUid,
        "😬 Point confirmed",
        `${submitterName} got you`
      );
    } else if (after.status === "rejected") {
      await sendToUser(
        accusedUid,
        "✅ Appeal successful",
        "Point rejected — you're off the hook"
      );
    }
  });
