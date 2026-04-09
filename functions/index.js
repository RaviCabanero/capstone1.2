/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onCall} = require("firebase-functions/v2/https");
const {onDocumentWritten, onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onUserCreated: onAuthUserCreated} = require("firebase-functions/v2/auth");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, doc, setDoc, updateDoc, getDoc} = require("firebase-admin/firestore");
const {getAuth} = require("firebase-admin/auth");
const nodemailer = require("nodemailer");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin
initializeApp();

// Gmail transporter - configure with your email settings
// You should use Gmail App Password for this
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER || "your-email@gmail.com",
    pass: process.env.GMAIL_PASSWORD || "your-app-password"
  }
});

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Helper: create an alias document keyed by lastName (if available).
// If the plain lastName id is taken by another user, append a short uid suffix.
async function ensureAliasByLastName(db, uid, { firstName = '', lastName = '', email = '', displayName = '', role = 'alumni', status = 'pending' } = {}) {
  const base = (lastName || '').toString().trim();
  if (!base) return null;

  let aliasId = base;
  let aliasRef = doc(db, 'users', aliasId);
  let snap = await getDoc(aliasRef);

  if (snap.exists) {
    const data = snap.data() || {};
    if (data.uid === uid) {
      // alias already points to this uid
      return aliasId;
    }
    // collision: create a unique alias using a short uid suffix
    const short = uid ? uid.toString().slice(0, 6) : Date.now().toString().slice(-6);
    aliasId = `${base}_${short}`;
    aliasRef = doc(db, 'users', aliasId);
    snap = await getDoc(aliasRef);
  }

  const aliasData = {
    uid,
    email,
    displayName,
    firstName,
    lastName,
    role,
    status,
    aliasOf: uid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await setDoc(aliasRef, aliasData, { merge: true });

  // create subcollection init docs under alias
  const subcollections = ['Chats', 'ConnectionRequest', 'IdRequest', 'Notifications', 'Post'];
  await Promise.all(subcollections.map((name) =>
    setDoc(doc(db, 'users', aliasId, name, 'init'), {
      initialized: true,
      createdAt: new Date().toISOString(),
      userId: uid,
      collection: name
    }, { merge: true })
  ));

  return aliasId;
}

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

/**
 * Send approval notification email to user
 */
exports.sendApprovalEmail = onCall(async (request) => {
  const { uid, email, firstName, lastName } = request.data;

  if (!uid || !email) {
    throw new Error("Missing required fields: uid, email");
  }

  try {
    const mailOptions = {
      from: process.env.GMAIL_USER || "noreply@josenianlink.com",
      to: email,
      subject: "Your JosenianLink Account Has Been Approved! 🎉",
      html: `
        <h2>Welcome to JosenianLink, ${firstName}!</h2>
        <p>Great news! Your account has been approved by our administrator.</p>
        <p>You can now log in and start exploring the alumni network.</p>
        <br>
        <p><strong>Account Details:</strong></p>
        <ul>
          <li>Name: ${firstName} ${lastName}</li>
          <li>Email: ${email}</li>
        </ul>
        <br>
        <p>
          <a href="https://josenianlink.com/login" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Go to Login
          </a>
        </p>
        <br>
        <p>If you have any questions, please contact us.</p>
        <p>Best regards,<br>JosenianLink Team</p>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Approval email sent to ${email}`, { uid });
    return { success: true, message: "Approval email sent" };
  } catch (error) {
    logger.error("Error sending approval email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
});

/**
 * Send rejection notification email to user
 */
exports.sendRejectionEmail = onCall(async (request) => {
  const { uid, email, firstName, lastName, reason } = request.data;

  if (!uid || !email) {
    throw new Error("Missing required fields: uid, email");
  }

  try {
    const mailOptions = {
      from: process.env.GMAIL_USER || "noreply@josenianlink.com",
      to: email,
      subject: "JosenianLink Registration Status Update",
      html: `
        <h2>Registration Update</h2>
        <p>Hi ${firstName},</p>
        <p>Unfortunately, your registration for JosenianLink has been declined by our administrator.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
        <p>If you believe this is a mistake or would like to appeal this decision, please contact us at support@josenianlink.com</p>
        <br>
        <p>Best regards,<br>JosenianLink Team</p>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Rejection email sent to ${email}`, { uid });
    return { success: true, message: "Rejection email sent" };
  } catch (error) {
    logger.error("Error sending rejection email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
});

/** * Trigger when a new user document is created in Firestore
 */
exports.onUserCreated = onDocumentCreated("users/{uid}", async (event) => {
  const uid = event.params.uid;

  const userData = event.data.after.data() || {};
  const displayName = (userData.displayName || '').toString().trim();
  const firstName = userData.firstName || displayName.split(/\s+/)[0] || '';
  const lastName = userData.lastName || displayName.split(/\s+/).slice(1).join(' ') || '';

  const db = getFirestore();
  const userDocRef = doc(db, 'users', uid);
  const updates = {};
  if (!userData.firstName && firstName) updates.firstName = firstName;
  if (!userData.lastName && lastName) updates.lastName = lastName;
  if (Object.keys(updates).length) {
    updates.updatedAt = new Date().toISOString();
    await updateDoc(userDocRef, updates);
  }

  const subcollections = [
    'Chats',
    'ConnectionRequest',
    'IdRequest',
    'Notifications',
    'Post'
  ];

  // Use a safe, non-reserved init document id
  await Promise.all(subcollections.map((name) => {
    return setDoc(doc(db, 'users', uid, name, 'init'), {
      initialized: true,
      createdAt: new Date().toISOString(),
      userId: uid,
      collection: name
    }, { merge: true });
  }));

  // Also create an alias document keyed by lastName for easier admin viewing
  try {
    await ensureAliasByLastName(db, uid, {
      firstName,
      lastName,
      email: userData.email || '',
      displayName: userData.displayName || '',
      role: userData.role || 'alumni',
      status: userData.status || 'pending'
    });
  } catch (err) {
    logger.warn(`Failed to create alias by lastName for user ${uid}: ${err?.message || err}`);
  }

  return null;
});

/**
 * Auth trigger: ensure a Firestore user document and required subcollections
 * are created as soon as an Auth user is created.
 */
exports.onAuthUserCreated = onAuthUserCreated(async (event) => {
  const authUser = event.data || {};
  const uid = authUser.uid;
  if (!uid) return null;

  const db = getFirestore();
  const userRef = doc(db, 'users', uid);
  const existing = await getDoc(userRef);

  // If the user document already has fields, don't overwrite
  if (existing.exists && Object.keys(existing.data() || {}).length > 0) {
    return null;
  }

  const displayName = (authUser.displayName || '').toString().trim();
  const firstName = displayName.split(/\s+/)[0] || '';
  const lastName = displayName.split(/\s+/).slice(1).join(' ') || '';
  const email = authUser.email || '';

  const userData = {
    uid,
    email,
    displayName: displayName || (email ? email.split('@')[0] : ''),
    firstName,
    lastName,
    role: 'alumni',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await setDoc(userRef, userData, { merge: true });

  const subcollections = ['Chats', 'ConnectionRequest', 'IdRequest', 'Notifications', 'Post'];
  await Promise.all(subcollections.map((name) =>
    setDoc(doc(db, 'users', uid, name, 'init'), {
      initialized: true,
      createdAt: new Date().toISOString(),
      userId: uid,
      collection: name
    }, { merge: true })
  ));

  // create alias doc keyed by lastName for admin readability
  try {
    await ensureAliasByLastName(db, uid, {
      firstName,
      lastName,
      email,
      displayName: userData.displayName || '',
      role: userData.role || 'alumni',
      status: userData.status || 'pending'
    });
  } catch (err) {
    logger.warn(`Failed to create alias by lastName for auth user ${uid}: ${err?.message || err}`);
  }

  return null;
});

/** * Trigger when user status is updated in Firestore
 */
exports.onUserStatusChanged = onDocumentWritten("users/{uid}", async (event) => {
  const uid = event.params.uid;
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();

  // Check if status changed
  const statusChanged = beforeData?.status !== afterData?.status;
  if (!statusChanged) {
    return null;
  }

  const email = afterData?.email;
  const firstName = afterData?.firstName || "User";
  const lastName = afterData?.lastName || "";
  const newStatus = afterData?.status;

  if (!email) {
    logger.warn(`No email found for user ${uid}`);
    return null;
  }

  try {
    if (newStatus === "approved") {
      const mailOptions = {
        from: process.env.GMAIL_USER || "noreply@josenianlink.com",
        to: email,
        subject: "Your JosenianLink Account Has Been Approved! 🎉",
        html: `
          <h2>Welcome to JosenianLink, ${firstName}!</h2>
          <p>Great news! Your account has been approved by our administrator.</p>
          <p>You can now log in and start exploring the alumni network.</p>
          <br>
          <p><strong>Account Details:</strong></p>
          <ul>
            <li>Name: ${firstName} ${lastName}</li>
            <li>Email: ${email}</li>
          </ul>
          <br>
          <p>
            <a href="https://josenianlink.com/login" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Go to Login
            </a>
          </p>
          <br>
          <p>If you have any questions, please contact us.</p>
          <p>Best regards,<br>JosenianLink Team</p>
        `
      };

      await transporter.sendMail(mailOptions);
      logger.info(`Auto-sent approval email to ${email}`, { uid });
    } else if (newStatus === "rejected") {
      const mailOptions = {
        from: process.env.GMAIL_USER || "noreply@josenianlink.com",
        to: email,
        subject: "JosenianLink Registration Status Update",
        html: `
          <h2>Registration Update</h2>
          <p>Hi ${firstName},</p>
          <p>Unfortunately, your registration for JosenianLink has been declined by our administrator.</p>
          <p>If you believe this is a mistake or would like to appeal this decision, please contact us at support@josenianlink.com</p>
          <br>
          <p>Best regards,<br>JosenianLink Team</p>
        `
      };

      await transporter.sendMail(mailOptions);
      logger.info(`Auto-sent rejection email to ${email}`, { uid });
    }
    return null;
  } catch (error) {
    logger.error(`Error sending notification email for user ${uid}:`, error);
    return null;
  }
});
