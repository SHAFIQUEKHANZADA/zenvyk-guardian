import type { Metadata } from "next";
import { Overview } from "@/components/dashboard/overview";

export const metadata: Metadata = { title: "Overview · Zenvyk Guardian" };

export default function DashboardPage() {
  return <Overview />;
}
