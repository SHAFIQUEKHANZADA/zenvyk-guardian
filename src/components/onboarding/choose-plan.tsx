"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ShieldCheck } from "lucide-react";
import { PLANS, SALES_EMAIL } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { Alert } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

/**
 * Post-signup plan chooser.
 * - Free → activate immediately (plan defaults to 'free') → dashboard.
 * - Pro  → Stripe Checkout. Plan is set to 'pro' ONLY by the Stripe webhook
 *          after payment succeeds — never from the client. Until then the
 *          account stays gated (backend enforces plan via profiles.plan).
 * - Enterprise → Contact Sales.
 */
export function ChoosePlan({ currentPlan }: { currentPlan: string }) {
  const router = useRouter();
  const [goingFree, setGoingFree] = useState(false);

  if (currentPlan === "pro") {
    return (
      <div className="mx-auto max-w-md text-center">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--pass-soft)] text-pass">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">You&apos;re on Pro 🎉</h1>
        <p className="mt-2 text-sm text-muted">
          Your payment is confirmed and Pro features are active.
        </p>
        <Button className="mt-6" onClick={() => router.push("/dashboard")}>
          Go to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight">Choose your plan</h1>
        <p className="mt-3 text-muted">
          Start free in seconds, or go Pro for the full 5-model ensemble. You can
          change this anytime.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-surface p-6",
              plan.popular ? "border-primary/60 shadow-lg shadow-primary/10" : "border-border",
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
                <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
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

            {plan.id === "free" ? (
              <Button
                variant="outline"
                className="w-full"
                disabled={goingFree}
                onClick={() => {
                  setGoingFree(true);
                  router.push("/dashboard");
                }}
              >
                Start on Free
              </Button>
            ) : plan.id === "pro" ? (
              <CheckoutButton className="w-full" variant="primary">
                Continue to payment
              </CheckoutButton>
            ) : (
              <a
                href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent(
                  "Zenvyk Guardian — Enterprise inquiry",
                )}`}
                className="w-full"
              >
                <Button variant="outline" className="w-full">
                  Contact Sales
                </Button>
              </a>
            )}
          </div>
        ))}
      </div>

      <Alert tone="info" className="mx-auto mt-8 max-w-2xl">
        Pro activates <strong>only after your payment is confirmed</strong> by Stripe.
        Until then your account stays on Free — no Pro features or limits are granted.
        You can start on Free now and upgrade whenever you like.
      </Alert>
    </div>
  );
}
