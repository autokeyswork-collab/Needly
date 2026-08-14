const { Expo } = require("expo-server-sdk");

const expo = new Expo();

/**
 * Sends a push notification to one or more Expo push tokens.
 * Silently skips invalid/missing tokens instead of throwing — a user who
 * hasn't opened the app yet (no token saved) shouldn't break the request
 * that's notifying them.
 */
async function sendPushNotification(tokens, { title, body, data }) {
  const tokenList = (Array.isArray(tokens) ? tokens : [tokens]).filter(Boolean);
  const messages = [];

  for (const token of tokenList) {
    if (!Expo.isExpoPushToken(token)) {
      console.warn(`Skipping invalid Expo push token: ${token}`);
      continue;
    }
    messages.push({ to: token, sound: "default", title, body, data });
  }

  if (messages.length === 0) return;

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      console.error("Push notification error:", err);
    }
  }
}

module.exports = { sendPushNotification };
