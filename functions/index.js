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
const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
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

/**
 * Trigger when user status is updated in Firestore
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
