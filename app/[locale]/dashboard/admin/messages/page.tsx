import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageIntro } from "@/components/dashboard/page-intro";
import { Card } from "@/components/ui/card";
import { listContactMessages } from "@/lib/db/queries";
import { isContactTopic } from "@/lib/contact";
import { requireAdmin } from "@/lib/session";

export default async function AdminMessagesPage() {
  await requireAdmin();
  const t = await getTranslations("Admin");
  const topics = await getTranslations("Contact");
  const format = await getFormatter();
  const messages = await listContactMessages();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/admin"
          className="text-sm font-medium text-heading hover:underline"
        >
          {t("messages.back")}
        </Link>
        <PageIntro title={t("messages.title")}>{t("messages.body")}</PageIntro>
      </div>
      {messages.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">{t("messages.empty")}</p>
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {messages.map((row) => (
            <li key={row.id} className="min-w-0">
              <Card className="flex h-full flex-col gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-medium text-heading">{row.name}</p>
                    {row.topic && isContactTopic(row.topic) ? (
                      <p className="text-sm text-muted">{topics(`topics.${row.topic}`)}</p>
                    ) : null}
                    <a
                      href={`mailto:${row.email}`}
                      className="text-sm text-muted hover:underline"
                    >
                      {row.email}
                    </a>
                  </div>
                  <div className="text-right text-xs text-muted">
                    <p>
                      {format.dateTime(new Date(row.createdAt), {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                    <p>
                      {row.locale} ·{" "}
                      {row.emailSent ? t("messages.emailSentYes") : t("messages.emailSentNo")}
                    </p>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink">{row.message}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
