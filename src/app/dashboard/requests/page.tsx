import { Inbox } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function RequestsPage() {
  return (
    <ComingSoon
      title="Requests"
      icon={Inbox}
      description="Browse, search, and inspect individual verification requests in detail."
    />
  );
}
