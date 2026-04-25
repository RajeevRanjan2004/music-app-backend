const nodemailer = require("nodemailer");

async function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_PASSWORD;

  if (gmailUser && gmailPassword) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });

    return {
      transporter,
      from: process.env.SMTP_FROM || gmailUser,
    };
  }

  if (!host || !user || !pass || !from) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM or GMAIL_USER/GMAIL_PASSWORD."
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return { transporter, from };
}

async function sendPasswordResetOtpEmail({ toEmail, userName, otpCode }) {
  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const subject = "Musicfy password reset OTP";
  const text = [
    `Hi ${userName || "there"},`,
    "",
    "You requested to reset your Musicfy password.",
    `Your OTP is: ${otpCode}`,
    "",
    "This OTP will expire in 10 minutes.",
    `Reset page: ${appUrl}/forgot-password`,
    "If you did not request this, please ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#111827;">
      <h2 style="margin-bottom:8px;">Musicfy password reset</h2>
      <p style="margin:0 0 16px;">Hi ${userName || "there"},</p>
      <p style="margin:0 0 16px;">You requested to reset your Musicfy password.</p>
      <div style="margin:24px 0;padding:16px;border-radius:10px;background:#111827;color:#ffffff;text-align:center;">
        <div style="font-size:13px;letter-spacing:1px;opacity:0.8;">YOUR OTP</div>
        <div style="font-size:32px;font-weight:700;letter-spacing:10px;margin-top:6px;">${otpCode}</div>
      </div>
      <p style="margin:0 0 10px;">This OTP will expire in 10 minutes.</p>
      <p style="margin:0;color:#6b7280;">If you did not request this, please ignore this email.</p>
    </div>
  `;

  const { transporter, from } = await createTransporter();

  await transporter.sendMail({
    from,
    to: toEmail,
    subject,
    text,
    html,
  });

  return { sent: true };
}

module.exports = { sendPasswordResetOtpEmail };
