import { CreditCard } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function BillingPage() {
  return (
    <ComingSoon
      title="Billing"
      icon={CreditCard}
      description="Manage your plan, payment method, and usage-based invoices."
    />
  );
}
