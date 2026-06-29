import { Bell } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function AlertsPage() {
  return (
    <ComingSoon
      title="Alerts"
      icon={Bell}
      description="Set up notifications for blocked requests, spikes, and policy violations."
    />
  );
}
