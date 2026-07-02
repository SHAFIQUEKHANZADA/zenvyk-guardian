import { Suspense } from "react";
import type { Metadata } from "next";
import { Overview } from "@/components/dashboard/overview";
import { UpgradeToast } from "@/components/billing/upgrade-toast";

export const metadata: Metadata = { title: "Overview · Zenvyk Guardian" };

export default function DashboardPage() {
  return (
    <>
      <Overview />
      <Suspense>
        <UpgradeToast />
      </Suspense>
    </>
  );
}
