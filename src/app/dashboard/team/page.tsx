import { Users } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function TeamPage() {
  return (
    <ComingSoon
      title="Team"
      icon={Users}
      description="Invite teammates and manage roles and permissions for your workspace."
    />
  );
}
