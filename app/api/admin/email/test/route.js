import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(request) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  try {
    const { to } = await request.json();
    const email = to || session.user.email;

    const result = await sendEmail({
      to: email,
      subject: "Test Email — Orvo",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;background:#FAFAFB;">
          <h2 style="color:#101114;">Test Email</h2>
          <p style="color:#6B6F76;">Your email settings are working correctly. This is a test email from Orvo admin panel.</p>
          <p style="color:#2E5BFF;font-size:12px;margin-top:24px;">Sent at ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Test email sent to ${email}` });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
