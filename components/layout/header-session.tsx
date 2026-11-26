"use client";

import { LayoutDashboard, LogIn, UserPlus, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { MorphSlot } from "@/components/layout/morph-slot";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

function CompactAction({
  href,
  variant = "primary",
  label,
  icon: Icon,
}: Readonly<{
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  label: string;
  icon: LucideIcon;
}>) {
  return (
    <Button
      href={href}
      variant={variant}
      size="sm"
      className="header-morph px-3 group-data-[compact=true]/header:h-8 group-data-[compact=true]/header:px-2"
    >
      <MorphSlot when="compact">
        <Icon className="size-4" aria-hidden />
      </MorphSlot>
      <MorphSlot>{label}</MorphSlot>
    </Button>
  );
}

/** Logged-out markup is the static HTML. A session swaps in the private-space link after hydration. */
export function HeaderSession({
  variant = "public",
}: Readonly<{ variant?: "public" | "auth" }>) {
  const t = useTranslations("Nav");
  const { data } = authClient.useSession();
  if (variant === "auth") return null;
  if (data?.user) {
    return (
      <CompactAction
        href="/dashboard"
        variant="secondary"
        label={t("privateSpace")}
        icon={LayoutDashboard}
      />
    );
  }
  return (
    <div className="flex items-center gap-2">
      <CompactAction href="/login" variant="ghost" label={t("login")} icon={LogIn} />
      <CompactAction href="/signup" label={t("signup")} icon={UserPlus} />
    </div>
  );
}
