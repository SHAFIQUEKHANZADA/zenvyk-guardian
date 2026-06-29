import { Activity } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function ActivityPage() {
  return (
    <ComingSoon
      title="Activity"
      icon={Activity}
      description="A full, filterable log of every verification across your workspace."
    />
  );
}
