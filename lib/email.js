import nodemailer from "nodemailer";
import { connectDB } from "./mongoose";
import Settings from "@/models/Settings";

async function getTransporter() {
  await connectDB();
  const settings = await Settings.findOne({}).lean();
  const cfg = settings?.emailSettings;
  if (!cfg?.smtpHost || !cfg?.smtpUser || !cfg?.smtpPass) return null;

  return {
    transporter: nodemailer.createTransport({
      host: cfg.smtpHost,
      port: cfg.smtpPort || 587,
      secure: cfg.smtpPort === 465,
      auth: { user: cfg.smtpUser, pass: cfg.smtpPass },
    }),
    from: `"${cfg.fromName || "Orvo"}" <${cfg.fromEmail || cfg.smtpUser}>`,
  };
}

export async function sendEmail({ to, subject, html }) {
  try {
    const result = await getTransporter();
    if (!result) {
      console.log("[Email] SMTP not configured — skipping");
      return { success: false, error: "SMTP not configured" };
    }
    const { transporter, from } = result;
    await transporter.sendMail({ from, to, subject, html });
    return { success: true };
  } catch (err) {
    console.error("[Email] Send error:", err.message);
    return { success: false, error: err.message };
  }
}

const base = (body) => `
<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#FAFAFB;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
<table width="100%" style="max-width:520px;background:#fff;border:1px solid #E4E6EA;">
  <tr><td style="background:#101114;padding:24px 32px;">
    <p style="margin:0;color:#FAFAFB;font-size:20px;font-weight:600;letter-spacing:4px;text-transform:uppercase;">Orvo</p>
    <p style="margin:4px 0 0;color:#6B6F76;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Lifestyle</p>
  </td></tr>
  <tr><td style="padding:32px;">${body}</td></tr>
  <tr><td style="background:#FAFAFB;padding:16px 32px;text-align:center;">
    <p style="margin:0;color:#6B6F76;font-size:11px;">© ${new Date().getFullYear()} Orvo. All rights reserved.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

export function otpTemplate(name, otp) {
  return base(`
    <p style="color:#101114;font-size:16px;margin:0 0 8px;">Hi ${name},</p>
    <p style="color:#6B6F76;font-size:14px;margin:0 0 32px;">Please verify your email address using the code below.</p>
    <div style="background:#FAFAFB;border:1px solid #E4E6EA;padding:28px;text-align:center;margin-bottom:32px;">
      <p style="margin:0 0 8px;color:#6B6F76;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Your Code</p>
      <p style="margin:0;color:#2E5BFF;font-size:42px;font-weight:700;letter-spacing:16px;">${otp}</p>
    </div>
    <p style="color:#6B6F76;font-size:13px;margin:0;">This code expires in <strong>15 minutes</strong>. If you didn't create an account, ignore this email.</p>
  `);
}

export function forgotPasswordTemplate(name, resetUrl) {
  return base(`
    <p style="color:#101114;font-size:16px;margin:0 0 8px;">Hi ${name},</p>
    <p style="color:#6B6F76;font-size:14px;margin:0 0 32px;">We received a request to reset your password. Click the button below to create a new one.</p>
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${resetUrl}" style="display:inline-block;background:#2E5BFF;color:#fff;text-decoration:none;padding:14px 32px;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Reset Password</a>
    </div>
    <p style="color:#6B6F76;font-size:13px;margin:0;">This link expires in <strong>1 hour</strong>. If you didn't request a password reset, ignore this email.</p>
  `);
}

export function orderConfirmationTemplate(order) {
  const items = order.items.map((item) =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #EDEFF2;color:#101114;font-size:14px;">${item.name} — ${item.size}</td>
      <td style="padding:8px 0;border-bottom:1px solid #EDEFF2;color:#101114;font-size:14px;text-align:right;">Tk ${(item.price * item.quantity).toLocaleString()}</td>
    </tr>`
  ).join("");
  return base(`
    <p style="color:#6B6F76;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">Order Confirmed</p>
    <p style="color:#101114;font-size:22px;font-weight:600;margin:0 0 4px;">${order.orderNumber}</p>
    <p style="color:#6B6F76;font-size:13px;margin:0 0 32px;">Thank you for your order! We'll send an update when it ships.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">${items}
      <tr><td style="padding:12px 0;color:#101114;font-weight:600;">Total</td>
        <td style="padding:12px 0;color:#2E5BFF;font-weight:700;font-size:16px;text-align:right;">Tk ${order.totalAmount.toLocaleString()}</td></tr>
    </table>
    <p style="color:#6B6F76;font-size:13px;margin:0 0 4px;"><strong style="color:#101114;">Shipping to:</strong> ${order.shippingAddress?.name}, ${order.shippingAddress?.street}, ${order.shippingAddress?.city}</p>
    <p style="color:#6B6F76;font-size:13px;margin:0;"><strong style="color:#101114;">Payment:</strong> ${order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}</p>
  `);
}

export function orderStatusTemplate(order) {
  const statusMessages = {
    processing: "Your order is being processed and will be shipped soon.",
    shipped: "Great news! Your order is on its way.",
    delivered: "Your order has been delivered. We hope you love it!",
    cancelled: "Your order has been cancelled. If you have questions, please contact us.",
  };
  const msg = statusMessages[order.orderStatus] || `Your order status is now: ${order.orderStatus}.`;
  return base(`
    <p style="color:#6B6F76;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">Order Update</p>
    <p style="color:#101114;font-size:22px;font-weight:600;margin:0 0 4px;">${order.orderNumber}</p>
    <p style="color:#6B6F76;font-size:14px;margin:0 0 24px;">${msg}</p>
    <div style="background:#FAFAFB;border:1px solid #E4E6EA;padding:16px 20px;display:inline-block;">
      <p style="margin:0;color:#6B6F76;font-size:11px;text-transform:uppercase;letter-spacing:2px;">Status</p>
      <p style="margin:4px 0 0;color:#101114;font-size:18px;font-weight:600;text-transform:capitalize;">${order.orderStatus}</p>
    </div>
  `);
}
