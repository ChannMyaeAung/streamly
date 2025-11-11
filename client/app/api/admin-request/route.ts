import { NextResponse } from "next/server";
import { Resend } from "resend";

const REQUIRED_ENV_VARS = [
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "ADMIN_EMAIL",
] as const;

type EmailConfig = {
  apiKey: string;
  fromEmail: string;
  adminEmail: string;
};

function resolveEmailConfig(): EmailConfig | null {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      "admin-request: email transport misconfigured; missing env vars:",
      missing.join(", ")
    );
    return null;
  }

  return {
    apiKey: process.env.RESEND_API_KEY!,
    fromEmail: process.env.RESEND_FROM_EMAIL!,
    adminEmail: process.env.ADMIN_EMAIL!,
  };
}

const EMAIL_DISABLED_MESSAGE =
  "Email service not configured. Please set RESEND_API_KEY, RESEND_FROM_EMAIL, and ADMIN_EMAIL.";

let emailConfigCache: EmailConfig | null = null;
let resendClient: Resend | null = null;

function getEmailConfig(): EmailConfig | null {
  if (emailConfigCache) {
    return emailConfigCache;
  }

  const resolved = resolveEmailConfig();
  if (resolved) {
    emailConfigCache = resolved;
  }

  return resolved;
}

function getResendClient(apiKey: string): Resend {
  if (resendClient) {
    return resendClient;
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { message: "Invalid request payload." },
        { status: 400 }
      );
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const comments =
      typeof body.comments === "string" ? body.comments.trim() : "";

    if (!name || !email || !comments) {
      return NextResponse.json(
        { message: "Name, email, and comments are required." },
        { status: 400 }
      );
    }

    const emailConfig = getEmailConfig();
    if (!emailConfig) {
      return NextResponse.json(
        { message: EMAIL_DISABLED_MESSAGE },
        { status: 503 }
      );
    }

    const resend = getResendClient(emailConfig.apiKey);

    await resend.emails.send({
      from: emailConfig.fromEmail,
      to: emailConfig.adminEmail,
      subject: "Streamly • Admin access request",
      replyTo: email,
      text: `Name: ${name}\nEmail: ${email}\n\nComments:\n${comments}`,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Comments:</strong></p>
        <p>${comments.replace(/\n/g, "<br />")}</p>
      `,
    });

    return NextResponse.json({ message: "Request submitted successfully." });
  } catch (error) {
    console.error("admin-request", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error && error.message === EMAIL_DISABLED_MESSAGE
            ? EMAIL_DISABLED_MESSAGE
            : "Unable to submit request right now.",
      },
      { status: 500 }
    );
  }
}
