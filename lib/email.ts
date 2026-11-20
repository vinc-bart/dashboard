import type { Transporter } from "nodemailer";
import type { Resend } from "resend";

export type MailerProvider = "mailpit" | "resend" | "console";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  headers?: Record<string, string>;
};

export function resolveMailerProvider(
  value: string | undefined = process.env.MAILER_PROVIDER,
): MailerProvider {
  const provider = value?.trim();
  if (provider === "resend" || provider === "console") return provider;
  return "mailpit";
}

export function emailFrom(value: string | undefined = process.env.EMAIL_FROM): string {
  const trimmed = value?.trim();
  return trimmed || "Paris Ouverte <noreply@localhost>";
}

export function smtpOptions(env?: { SMTP_HOST?: string; SMTP_PORT?: string }) {
  const resolved = env ?? {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
  };
  return {
    host: resolved.SMTP_HOST || "localhost",
    port: Number(resolved.SMTP_PORT || 1025),
    secure: false as const,
  };
}

export function assertMailerConfig(env?: {
  MAILER_PROVIDER?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
}) {
  const resolved = env ?? {
    MAILER_PROVIDER: process.env.MAILER_PROVIDER,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
  };
  if (resolveMailerProvider(resolved.MAILER_PROVIDER) !== "resend") return;
  if (!resolved.RESEND_API_KEY?.trim()) {
    throw new Error("RESEND_API_KEY is required when MAILER_PROVIDER=resend");
  }
  if (!resolved.EMAIL_FROM?.trim()) {
    throw new Error("EMAIL_FROM is required when MAILER_PROVIDER=resend");
  }
}

let mailpitTransporter: Transporter | null = null;
let resendClient: Resend | null = null;

async function getMailpitTransporter() {
  if (!mailpitTransporter) {
    const nodemailer = await import("nodemailer");
    mailpitTransporter = nodemailer.createTransport(smtpOptions());
  }
  return mailpitTransporter;
}

async function getResendClient() {
  assertMailerConfig();
  if (!resendClient) {
    const { Resend } = await import("resend");
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

async function sendWithMailpit(input: SendEmailInput) {
  const transporter = await getMailpitTransporter();
  await transporter.sendMail({
    from: emailFrom(),
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    replyTo: input.replyTo,
    headers: input.headers,
  });
}

async function sendWithResend(input: SendEmailInput) {
  const resend = await getResendClient();
  const { error } = await resend.emails.send({
    from: emailFrom(),
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    replyTo: input.replyTo,
    headers: input.headers,
  });
  if (error) {
    throw new Error(error.message);
  }
}

/** Dev-server convenience. Prints the message instead of opening an SMTP connection. */
export function logConsoleEmail(
  input: SendEmailInput,
  nodeEnv: string | undefined = process.env.NODE_ENV,
) {
  if (nodeEnv === "production") {
    throw new Error("MAILER_PROVIDER=console is not available in production");
  }
  const lines = [
    input.replyTo ? `Reply-To: ${input.replyTo}` : "",
    ...Object.entries(input.headers ?? {}).map(([name, value]) => `${name}: ${value}`),
  ].filter(Boolean);
  const extra = lines.length ? `\n${lines.join("\n")}` : "";
  console.info(`[mail] To: ${input.to}\nSubject: ${input.subject}${extra}\n\n${input.text}`);
}

/** Dev-server convenience. Production never prints the sign-in code. */
export function logDevSignInCode(
  email: string,
  otp: string,
  nodeEnv: string | undefined = process.env.NODE_ENV,
) {
  if (nodeEnv !== "development") return;
  console.info(`[dev] Sign-in code for ${email}: ${otp}`);
}

export async function sendEmail(
  input: SendEmailInput,
  provider: MailerProvider = resolveMailerProvider(),
): Promise<void> {
  if (provider === "console") {
    logConsoleEmail(input);
    return;
  }
  if (provider === "resend") {
    await sendWithResend(input);
    return;
  }
  await sendWithMailpit(input);
}
