import { Server } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function EndpointsPage() {
  return (
    <ComingSoon
      title="Endpoints"
      icon={Server}
      description="Manage your Guardian API endpoints and monitor their health."
    />
  );
}
