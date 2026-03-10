import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "TradeX AI <onboarding@resend.dev>";

function baseTemplate(title: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:40px 24px;">
<div style="text-align:center;margin-bottom:32px;">
<h1 style="color:#fff;font-size:22px;font-weight:300;letter-spacing:1px;margin:0;">TradeX AI</h1>
</div>
<div style="background:#111;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:32px 24px;">
<h2 style="color:#fff;font-size:18px;font-weight:500;margin:0 0 20px 0;">${title}</h2>
${content}
</div>
<div style="text-align:center;margin-top:32px;">
<p style="color:#666;font-size:11px;margin:0;">This is an automated message from TradeX AI. Please do not reply.</p>
<p style="color:#444;font-size:11px;margin:8px 0 0 0;">&copy; ${new Date().getFullYear()} TradeX AI. All rights reserved.</p>
</div>
</div>
</body>
</html>`;
}

function otpBlock(otp: string): string {
  return `<div style="background:#000;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
<span style="color:#fff;font-size:32px;font-weight:700;letter-spacing:8px;font-family:'Courier New',monospace;">${otp}</span>
</div>
<p style="color:#888;font-size:13px;margin:0;">This code expires in <strong style="color:#fff;">10 minutes</strong>. Do not share it with anyone.</p>`;
}

function infoRow(label: string, value: string): string {
  return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
<span style="color:#888;font-size:13px;">${label}</span>
<span style="color:#fff;font-size:13px;font-weight:500;">${value}</span>
</div>`;
}

export async function sendWelcomeEmail(email: string): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Welcome to TradeX AI — Your Account is Ready",
      html: baseTemplate("Welcome to TradeX AI!", `
<p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
Your account has been successfully created. You're now part of a community using advanced Multi-AI Consensus trading signals.
</p>
<p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
Here's what you can do next:
</p>
<ul style="color:#ccc;font-size:14px;line-height:1.8;margin:0 0 20px 0;padding-left:20px;">
<li>Complete your KYC verification</li>
<li>Fund your wallet via Crypto, UPI, or IMPS</li>
<li>Start trading with AI-powered signals</li>
</ul>
<p style="color:#888;font-size:13px;margin:0;">
Trade smart. Trade with AI consensus.
</p>`),
    });
    console.log("[Email] Welcome email sent to", email);
  } catch (e: any) {
    console.error("[Email] Failed to send welcome email:", e.message);
  }
}

export async function sendForgotPasswordOTP(email: string, otp: string): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "TradeX AI — Password Reset Code",
      html: baseTemplate("Password Reset", `
<p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
We received a request to reset the password for your TradeX AI account. Use the verification code below to proceed:
</p>
${otpBlock(otp)}
<p style="color:#888;font-size:13px;margin:16px 0 0 0;">
If you did not request this, please ignore this email. Your password will remain unchanged.
</p>`),
    });
    console.log("[Email] Forgot password OTP sent to", email);
  } catch (e: any) {
    console.error("[Email] Failed to send forgot password OTP:", e.message);
  }
}

export async function sendWithdrawalOTP(email: string, otp: string, amount: string, type: string): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "TradeX AI — Withdrawal Verification Code",
      html: baseTemplate("Withdrawal Verification", `
<p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
A withdrawal request has been initiated from your account. Please verify this transaction with the code below:
</p>
${otpBlock(otp)}
<div style="margin:20px 0;padding:16px;background:#000;border-radius:8px;border:1px solid rgba(255,255,255,0.06);">
${infoRow("Amount", amount + " USDT")}
${infoRow("Method", type.toUpperCase())}
</div>
<p style="color:#f87171;font-size:13px;margin:0;">
⚠ If you did not initiate this withdrawal, secure your account immediately by changing your password.
</p>`),
    });
    console.log("[Email] Withdrawal OTP sent to", email);
  } catch (e: any) {
    console.error("[Email] Failed to send withdrawal OTP:", e.message);
  }
}

export async function sendDepositStatusEmail(
  email: string,
  status: "approved" | "rejected" | "processing",
  amount: string,
  type: string,
  notes?: string
): Promise<void> {
  const statusConfig = {
    approved: { color: "#22c55e", label: "Approved", icon: "✅" },
    rejected: { color: "#ef4444", label: "Rejected", icon: "❌" },
    processing: { color: "#3b82f6", label: "Processing", icon: "⏳" },
  };
  const cfg = statusConfig[status];

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `TradeX AI — Deposit ${cfg.label}`,
      html: baseTemplate(`Deposit ${cfg.label} ${cfg.icon}`, `
<p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
Your deposit request has been <strong style="color:${cfg.color};">${cfg.label.toLowerCase()}</strong>.
</p>
<div style="margin:20px 0;padding:16px;background:#000;border-radius:8px;border:1px solid rgba(255,255,255,0.06);">
${infoRow("Amount", amount + " USDT")}
${infoRow("Method", type.toUpperCase())}
${infoRow("Status", `<span style="color:${cfg.color};">${cfg.label}</span>`)}
</div>
${status === "approved" ? `<p style="color:#ccc;font-size:14px;margin:0;">Your wallet balance has been updated. You can start trading now.</p>` : ""}
${status === "rejected" && notes ? `<p style="color:#f87171;font-size:13px;margin:0;">Reason: ${notes}</p>` : ""}
${status === "processing" ? `<p style="color:#ccc;font-size:13px;margin:0;">Your deposit is being processed. We'll notify you once it's complete.</p>` : ""}`),
    });
    console.log("[Email] Deposit status email sent to", email);
  } catch (e: any) {
    console.error("[Email] Failed to send deposit status email:", e.message);
  }
}

export async function sendWithdrawalStatusEmail(
  email: string,
  status: "approved" | "rejected" | "processing",
  amount: string,
  type: string,
  notes?: string
): Promise<void> {
  const statusConfig = {
    approved: { color: "#22c55e", label: "Approved", icon: "✅" },
    rejected: { color: "#ef4444", label: "Rejected", icon: "❌" },
    processing: { color: "#3b82f6", label: "Processing", icon: "⏳" },
  };
  const cfg = statusConfig[status];

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `TradeX AI — Withdrawal ${cfg.label}`,
      html: baseTemplate(`Withdrawal ${cfg.label} ${cfg.icon}`, `
<p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
Your withdrawal request has been <strong style="color:${cfg.color};">${cfg.label.toLowerCase()}</strong>.
</p>
<div style="margin:20px 0;padding:16px;background:#000;border-radius:8px;border:1px solid rgba(255,255,255,0.06);">
${infoRow("Amount", amount + " USDT")}
${infoRow("Method", type.toUpperCase())}
${infoRow("Status", `<span style="color:${cfg.color};">${cfg.label}</span>`)}
</div>
${status === "approved" ? `<p style="color:#ccc;font-size:14px;margin:0;">Your withdrawal has been processed and funds have been sent.</p>` : ""}
${status === "rejected" ? `<p style="color:#ccc;font-size:14px;margin:0;">Your funds have been returned to your wallet balance.</p>${notes ? `<p style="color:#f87171;font-size:13px;margin:8px 0 0 0;">Reason: ${notes}</p>` : ""}` : ""}
${status === "processing" ? `<p style="color:#ccc;font-size:13px;margin:0;">Your withdrawal is being processed. We'll notify you once the transfer is complete.</p>` : ""}`),
    });
    console.log("[Email] Withdrawal status email sent to", email);
  } catch (e: any) {
    console.error("[Email] Failed to send withdrawal status email:", e.message);
  }
}

export async function sendKycStatusEmail(
  email: string,
  status: "verified" | "rejected",
  notes?: string
): Promise<void> {
  const isVerified = status === "verified";

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `TradeX AI — KYC ${isVerified ? "Verified" : "Rejected"}`,
      html: baseTemplate(`KYC ${isVerified ? "Verified ✅" : "Rejected ❌"}`, `
<p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
${isVerified
  ? "Your identity has been successfully verified. You can now make deposits and start trading."
  : "Your KYC submission has been rejected. Please submit a new document with a clear image."}
</p>
${!isVerified && notes ? `<p style="color:#f87171;font-size:13px;margin:0;">Reason: ${notes}</p>` : ""}
${isVerified ? `<p style="color:#22c55e;font-size:14px;margin:0;font-weight:500;">Your account is now fully verified.</p>` : ""}`),
    });
    console.log("[Email] KYC status email sent to", email);
  } catch (e: any) {
    console.error("[Email] Failed to send KYC status email:", e.message);
  }
}

export async function sendRegistrationOTP(email: string, otp: string): Promise<boolean> {
  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "TradeX AI — Verify Your Email",
      html: baseTemplate("Verify Your Email", `
<p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
Welcome to TradeX AI! Please verify your email address using the code below to complete your registration:
</p>
${otpBlock(otp)}
<p style="color:#888;font-size:13px;margin:16px 0 0 0;">
If you did not create an account, please ignore this email.
</p>`),
    });
    console.log("[Email] Registration OTP sent to", email, "result:", JSON.stringify(result));
    if ((result as any).error) {
      console.error("[Email] Resend API error:", JSON.stringify((result as any).error));
      return false;
    }
    return true;
  } catch (e: any) {
    console.error("[Email] Failed to send registration OTP:", e.message, e.statusCode, JSON.stringify(e));
    return false;
  }
}

export async function sendLoginOTP(email: string, otp: string): Promise<boolean> {
  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "TradeX AI — Login Verification Code",
      html: baseTemplate("Login Verification", `
<p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
A login attempt was detected for your TradeX AI account. Please enter the verification code below to continue:
</p>
${otpBlock(otp)}
<p style="color:#888;font-size:13px;margin:16px 0 0 0;">
If this wasn't you, please change your password immediately.
</p>`),
    });
    console.log("[Email] Login OTP sent to", email, "result:", JSON.stringify(result));
    if ((result as any).error) {
      console.error("[Email] Resend API error:", JSON.stringify((result as any).error));
      return false;
    }
    return true;
  } catch (e: any) {
    console.error("[Email] Failed to send login OTP:", e.message, JSON.stringify(e));
    return false;
  }
}

export async function sendSupportTicket(
  userEmail: string,
  department: string,
  subject: string,
  description: string
): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: "support@tradexai.in",
      replyTo: userEmail,
      subject: `[${department}] ${subject}`,
      html: baseTemplate(`Support Request — ${department}`, `
<div style="margin:0 0 20px 0;padding:16px;background:#000;border-radius:8px;border:1px solid rgba(255,255,255,0.06);">
${infoRow("From", userEmail)}
${infoRow("Department", department)}
${infoRow("Subject", subject)}
${infoRow("Time", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }))}
</div>
<div style="margin:16px 0 0 0;">
<p style="color:#888;font-size:12px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:1px;">Description</p>
<p style="color:#ccc;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${description}</p>
</div>`),
    });
    console.log("[Email] Support ticket sent from", userEmail);
  } catch (e: any) {
    console.error("[Email] Failed to send support ticket:", e.message);
    throw e;
  }
}

export async function sendSupportConfirmation(
  userEmail: string,
  department: string,
  subject: string
): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: "TradeX AI — Support Request Received",
      html: baseTemplate("We've Received Your Request", `
<p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
Thank you for reaching out. We've received your support request and our team will get back to you within 24 hours.
</p>
<div style="margin:20px 0;padding:16px;background:#000;border-radius:8px;border:1px solid rgba(255,255,255,0.06);">
${infoRow("Department", department)}
${infoRow("Subject", subject)}
</div>
<p style="color:#888;font-size:13px;margin:0;">
If you have additional information, reply to this email or submit another request.
</p>`),
    });
    console.log("[Email] Support confirmation sent to", userEmail);
  } catch (e: any) {
    console.error("[Email] Failed to send support confirmation:", e.message);
  }
}

export async function sendLoginAlertEmail(email: string): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "TradeX AI — New Login Detected",
      html: baseTemplate("New Login Detected", `
<p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
A new login to your TradeX AI account was detected.
</p>
<div style="margin:20px 0;padding:16px;background:#000;border-radius:8px;border:1px solid rgba(255,255,255,0.06);">
${infoRow("Time", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }))}
</div>
<p style="color:#888;font-size:13px;margin:0;">
If this wasn't you, please change your password immediately.
</p>`),
    });
    console.log("[Email] Login alert sent to", email);
  } catch (e: any) {
    console.error("[Email] Failed to send login alert:", e.message);
  }
}
