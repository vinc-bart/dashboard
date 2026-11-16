import { getTranslations } from "next-intl/server";
import { ContactForm } from "@/components/contact/contact-form";
import { DashboardFrame } from "@/components/layout/dashboard-frame";
import { SiteFooter, SiteHeader } from "@/components/layout/site-chrome";
import { Card } from "@/components/ui/card";
import { PageTitle } from "@/components/ui/heading";
import { isAdminUser } from "@/lib/admin";
import { getSession } from "@/lib/session";

export default async function ContactPage() {
  const t = await getTranslations("Contact");
  const session = await getSession();
  const admin = session ? isAdminUser(session.user) : false;
  const card = (
    <Card className="relative w-full max-w-md">
      <span className="mb-4 block h-1 w-10 bg-accent" aria-hidden />
      <PageTitle>{t("title")}</PageTitle>
      <p className="mt-1 mb-6 text-sm text-muted">{t("body")}</p>
      <ContactForm />
    </Card>
  );

  if (admin) {
    return (
      <DashboardFrame>
        <div className="flex justify-center py-8">{card}</div>
      </DashboardFrame>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center justify-center px-6 py-16">
        {card}
      </main>
      <SiteFooter />
    </div>
  );
}
