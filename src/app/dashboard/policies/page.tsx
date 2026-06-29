import { Shield } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function PoliciesPage() {
  return (
    <ComingSoon
      title="Policies"
      icon={Shield}
      description="Define custom verification policies and content rules per workspace."
    />
  );
}
