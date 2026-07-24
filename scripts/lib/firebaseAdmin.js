// Shared firebase-admin bootstrap for every scripts/ Node script (run
// standalone via GitHub Actions, not as Firebase Cloud Functions). Auth
// comes from the standard GOOGLE_APPLICATION_CREDENTIALS env var, which the
// GitHub Actions workflows point at a temp file holding the
// FIREBASE_SERVICE_ACCOUNT_KEY secret's JSON content — admin.initializeApp()
// picks that up automatically with no extra code here.
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

function getFirestore() {
  return admin.firestore();
}

function getMessaging() {
  return admin.messaging();
}

module.exports = { admin, getFirestore, getMessaging };
