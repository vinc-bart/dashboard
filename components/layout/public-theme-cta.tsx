"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/** Signup is the static default. A session swaps the button to the dashboard map. */
export function PublicThemeCta({
  dashboardHref,
}: Readonly<{ dashboardHref: string }>) {
  const t = useTranslations("PublicTheme");
  const { data } = authClient.useSession();
  if (data?.user) {
    return <Button href={dashboardHref}>{t("openMap")}</Button>;
  }
  return (
    <>
      <Button href="/signup">{t("signup")}</Button>
      <p className="mt-3 text-sm text-muted">{t("signupHint")}</p>
    </>
  );
}
