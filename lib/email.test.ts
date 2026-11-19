import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertMailerConfig,
  emailFrom,
  logConsoleEmail,
  logDevSignInCode,
  resolveMailerProvider,
  sendEmail,
  smtpOptions,
} from "./email";
import { otpTokenHeader } from "./email/otp-token";
import {
  alertMail,
  changeEmailMail,
  contactMail,
  escapeHtml,
  otpMail,
  resetPasswordMail,
  stripHeaderBreaks,
  verificationMail,
} from "./email/templates";

describe("resolveMailerProvider", () => {
  it("defaults to mailpit", () => {
    expect(resolveMailerProvider(undefined)).toBe("mailpit");
    expect(resolveMailerProvider("")).toBe("mailpit");
    expect(resolveMailerProvider("smtp")).toBe("mailpit");
  });

  it("selects resend when requested", () => {
    expect(resolveMailerProvider("resend")).toBe("resend");
  });

  it("selects the console logger when requested", () => {
    expect(resolveMailerProvider("console")).toBe("console");
    expect(resolveMailerProvider("  console  ")).toBe("console");
  });
});

describe("emailFrom", () => {
  it("uses a local default when unset", () => {
    expect(emailFrom(undefined)).toBe("Paris Ouverte <noreply@localhost>");
    expect(emailFrom("  ")).toBe("Paris Ouverte <noreply@localhost>");
  });

  it("keeps a configured sender", () => {
    expect(emailFrom("Paris Ouverte <noreply@example.com>")).toBe(
      "Paris Ouverte <noreply@example.com>",
    );
  });
});

describe("smtpOptions", () => {
  it("targets Mailpit by default", () => {
    expect(smtpOptions({})).toEqual({
      host: "localhost",
      port: 1025,
      secure: false,
    });
  });

  it("reads host and port from env", () => {
    expect(smtpOptions({ SMTP_HOST: "mail", SMTP_PORT: "2525" })).toEqual({
      host: "mail",
      port: 2525,
      secure: false,
    });
  });
});

describe("logDevSignInCode", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints the code in development", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    logDevSignInCode("you@example.com", "123456", "development");
    expect(info).toHaveBeenCalledWith("[dev] Sign-in code for you@example.com: 123456");
  });

  it("stays silent outside development", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    logDevSignInCode("you@example.com", "123456", "production");
    logDevSignInCode("you@example.com", "123456", "test");
    logDevSignInCode("you@example.com", "123456", undefined);
    expect(info).not.toHaveBeenCalled();
  });
});

describe("logConsoleEmail", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const message = {
    to: "hello@localhost",
    subject: "Contact",
    text: "Bonjour",
    html: "<p>Bonjour</p>",
    replyTo: "ada@example.com",
  };

  it("prints the message outside production", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    logConsoleEmail(message, "development");
    expect(info).toHaveBeenCalledWith(
      "[mail] To: hello@localhost\nSubject: Contact\nReply-To: ada@example.com\n\nBonjour",
    );
  });

  it("refuses to swallow mail in production", () => {
    expect(() => logConsoleEmail(message, "production")).toThrow(/not available in production/);
  });

  it("is what sendEmail uses for the console provider", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await sendEmail(message, "console");
    expect(info).toHaveBeenCalledOnce();
  });

  it("prints custom headers", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    logConsoleEmail(
      {
        ...message,
        headers: { "OTP-Token": '"123456"; origin="http://localhost:3000"' },
      },
      "development",
    );
    expect(info).toHaveBeenCalledWith(
      '[mail] To: hello@localhost\nSubject: Contact\nReply-To: ada@example.com\nOTP-Token: "123456"; origin="http://localhost:3000"\n\nBonjour',
    );
  });
});

describe("assertMailerConfig", () => {
  it("ignores mailpit and console", () => {
    expect(() => assertMailerConfig({ MAILER_PROVIDER: "mailpit" })).not.toThrow();
    expect(() => assertMailerConfig({ MAILER_PROVIDER: "console" })).not.toThrow();
  });

  it("requires key and sender for resend", () => {
    expect(() => assertMailerConfig({ MAILER_PROVIDER: "resend" })).toThrow(/RESEND_API_KEY/);
    expect(() =>
      assertMailerConfig({ MAILER_PROVIDER: "resend", RESEND_API_KEY: "re_test" }),
    ).toThrow(/EMAIL_FROM/);
    expect(() =>
      assertMailerConfig({
        MAILER_PROVIDER: "resend",
        RESEND_API_KEY: "re_test",
        EMAIL_FROM: "Paris Ouverte <noreply@example.com>",
      }),
    ).not.toThrow();
  });
});

describe("escapeHtml", () => {
  it("escapes markup", () => {
    expect(escapeHtml(`<a href="x">y&z</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;y&amp;z&lt;/a&gt;",
    );
  });
});

describe("mail templates", () => {
  const url = "https://example.com/confirm?x=<token>";
  const escapedUrl = escapeHtml(url);

  it("builds verification mail with button and text url", () => {
    const mail = verificationMail(url);
    expect(mail.subject).toBe("Confirmez votre adresse e-mail");
    expect(mail.text).toContain(url);
    expect(mail.html).toContain("Confirmer l’adresse");
    expect(mail.html).toContain(escapedUrl);
    expect(mail.html).not.toContain(`href="${url}"`);
  });

  it("builds otp mail without putting the code in the subject", () => {
    const mail = otpMail("123456");
    const ignore = "Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.";
    expect(mail.subject).toBe("Votre code de connexion");
    expect(mail.subject).not.toContain("123456");
    expect(mail.text).toBe(
      ["123456", "", "Votre code de connexion Paris Ouverte.", "Il expire dans 3 minutes.", ignore].join(
        "\n",
      ),
    );
    expect(mail.html).toContain(">123456</p>");
    expect(mail.html).toContain("3 minutes");
    expect(mail.html).toContain(ignore);
    const preview = mail.html.match(/display:none[^>]*>([^<]*)</);
    expect(preview?.[1]).toBe("Votre code expire dans 3 minutes.");
    expect(preview?.[1]).not.toContain("123456");
  });

  it("builds change-email mail with escaped address", () => {
    const mail = changeEmailMail(url, `a<b>@example.com`);
    expect(mail.subject).toBe("Confirmez le changement d’e-mail");
    expect(mail.text).toContain("a<b>@example.com");
    expect(mail.html).toContain("a&lt;b&gt;@example.com");
    expect(mail.html).toContain("Confirmer le changement");
  });

  it("builds reset-password mail", () => {
    const mail = resetPasswordMail(url);
    expect(mail.subject).toBe("Réinitialisez votre mot de passe");
    expect(mail.text).toContain(url);
    expect(mail.html).toContain("Choisir un mot de passe");
    expect(mail.html).toContain(escapedUrl);
  });

  it("builds contact mail with escaped message", () => {
    const mail = contactMail({
      name: "Ada <Lovelace>",
      email: "ada@example.com",
      topic: "Question",
      message: "Hello\n<script>x</script>",
      locale: "fr",
    });
    expect(mail.subject).toContain("Ada <Lovelace>");
    expect(mail.text).toContain("Hello\n<script>x</script>");
    expect(mail.html).toContain("Ada &lt;Lovelace&gt;");
    expect(mail.html).toContain("Hello<br />&lt;script&gt;x&lt;/script&gt;");
    expect(mail.html).not.toContain("<script>x</script>");
  });

  it("strips CR/LF from contact subject and preview", () => {
    const mail = contactMail({
      name: "Ada\r\nBcc: evil@example.com",
      email: "ada@example.com",
      topic: "Question\r\nBcc: evil@example.com",
      message: "hi",
      locale: "fr",
    });
    expect(mail.text).not.toMatch(/[\r\n].*Bcc/);
    expect(mail.text).toContain("Question Bcc: evil@example.com");
    expect(mail.subject).not.toMatch(/[\r\n]/);
    expect(mail.subject).toBe("Contact Paris Ouverte · Ada Bcc: evil@example.com");
    expect(stripHeaderBreaks("a\rb\nc")).toBe("a b c");
  });

  it("strips CR/LF from alert subject", () => {
    const mail = alertMail({
      station: "Nation\r\nBcc: evil@example.com",
      bikes: "2",
      threshold: "3",
      url: "https://example.com/alerts",
    });
    expect(mail.subject).not.toMatch(/[\r\n]/);
    expect(mail.subject).toContain("Nation Bcc:");
  });

  it("keeps the code out of the subject in every locale", () => {
    for (const locale of ["fr", "en", "es"] as const) {
      const mail = otpMail("123456", locale);
      expect(mail.text.startsWith("123456\n")).toBe(true);
      expect(mail.subject).not.toContain("123456");
      expect(mail.html).toContain(">123456</p>");
    }
  });
});

describe("otpTokenHeader", () => {
  it("canonicalizes an https origin and drops the default port", () => {
    expect(otpTokenHeader("123456", "https://Dashboard.vvbb.fr/fr/login")).toBe(
      '"123456"; origin="https://dashboard.vvbb.fr"',
    );
    expect(otpTokenHeader("123456", "https://dashboard.vvbb.fr:443")).toBe(
      '"123456"; origin="https://dashboard.vvbb.fr"',
    );
    expect(otpTokenHeader("123456", "http://localhost:80/fr")).toBe(
      '"123456"; origin="http://localhost"',
    );
    expect(otpTokenHeader("123456", "http://127.0.0.1:3000")).toBe(
      '"123456"; origin="http://127.0.0.1:3000"',
    );
  });

  it("omits the header when the origin is not trustworthy", () => {
    expect(otpTokenHeader("123456", "http://evil.example")).toBeNull();
    expect(otpTokenHeader("123456", undefined)).toBeNull();
    expect(otpTokenHeader("123456", "not a url")).toBeNull();
  });

  it("escapes quotes in the code", () => {
    expect(otpTokenHeader('ab"cd', "https://example.com")).toBe(
      '"ab\\"cd"; origin="https://example.com"',
    );
  });
});
