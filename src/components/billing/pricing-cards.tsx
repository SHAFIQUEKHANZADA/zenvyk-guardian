import Link from "next/link";
import { Check } from "lucide-react";
import { PLANS, SALES_EMAIL, type Plan } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { CheckoutButton } from "./checkout-button";
import { cn } from "@/lib/utils";

/**
 * Three-tier pricing grid (dark). Pro carries the "MOST POPULAR" badge and
 * triggers Stripe Checkout; Free → signup; Enterprise → Contact Sales (email).
 */
export function PricingCards({ currentPlan }: { currentPlan?: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {PLANS.map((plan) => (
        <PlanCard key={plan.id} plan={plan} currentPlan={currentPlan} />
      ))}
    </div>
  );
}

function PlanCard({
  plan,
  currentPlan,
}: {
  plan: Plan;
  currentPlan?: string;
}) {
  const isCurrent = currentPlan === plan.id;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-surface p-6",
        plan.popular
          ? "border-primary/60 shadow-lg shadow-primary/10"
          : "border-border",
      )}
    >
      {plan.popular ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">
          Most Popular
        </span>
      ) : null}

      <div className="mb-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {plan.name}
        </h3>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-4xl font-bold tracking-tight">
            {plan.price}
          </span>
          {plan.priceSuffix ? (
            <span className="text-sm text-muted">{plan.priceSuffix}</span>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-muted">{plan.tagline}</p>
      </div>

      <ul className="mb-6 flex-1 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="text-foreground/90">{f}</span>
          </li>
        ))}
      </ul>

      <PlanCta plan={plan} isCurrent={isCurrent} />
    </div>
  );
}

function PlanCta({ plan, isCurrent }: { plan: Plan; isCurrent: boolean }) {
  if (isCurrent) {
    return (
      <Button variant="secondary" className="w-full" disabled>
        Current plan
      </Button>
    );
  }

  if (plan.id === "free") {
    return (
      <Link href="/signup" className="w-full">
        <Button variant="outline" className="w-full">
          {plan.cta}
        </Button>
      </Link>
    );
  }

  if (plan.id === "pro") {
    return (
      <CheckoutButton className="w-full" variant="primary">
        {plan.cta}
      </CheckoutButton>
    );
  }

  // Enterprise → Contact Sales (email, no checkout)
  return (
    <a
      href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent(
        "Zenvyk Guardian — Enterprise inquiry",
      )}`}
      className="w-full"
    >
      <Button variant="outline" className="w-full">
        {plan.cta}
      </Button>
    </a>
  );
}
