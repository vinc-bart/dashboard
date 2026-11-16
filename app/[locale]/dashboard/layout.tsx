import type { ReactNode } from "react";
import { DashboardFrame } from "@/components/layout/dashboard-frame";

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <DashboardFrame>{children}</DashboardFrame>;
}
