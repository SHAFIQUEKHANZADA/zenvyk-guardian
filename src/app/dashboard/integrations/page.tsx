import { Plug } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function IntegrationsPage() {
  return (
    <ComingSoon
      title="Integrations"
      icon={Plug}
      description="Connect Guardian to Slack, webhooks, and your existing AI pipeline."
    />
  );
}
