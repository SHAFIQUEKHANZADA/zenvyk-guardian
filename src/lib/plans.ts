/**
 * Plan definitions — mirrors the table in Zenvyk_Guardian_Stripe_Prompts.md.
 * Only Pro is self-serve (Stripe Checkout); Enterprise is Contact Sales.
 */

export type PlanId = "free" | "pro" | "enterprise";

export interface Plan {
  id: PlanId;
  name: string;
  price: string;
  priceSuffix?: string;
  tagline: string;
  features: string[];
  cta: string;
  popular?: boolean;
}

export const SALES_EMAIL = "reid@zenvyk.com";

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    tagline: "Get started with single-model verification.",
    features: [
      "10 verified requests/day",
      "Single-model verification",
      "Basic hallucination blocking",
      "Dashboard access",
      "Community support",
    ],
    cta: "Get Started Free",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$299",
    priceSuffix: "/mo",
    tagline: "Full 5-model ensemble for production AI.",
    features: [
      "100,000 verified requests/mo",
      "Full 5-model ensemble",
      "NLI + drift detection",
      "Webhook alerts",
      "Priority support",
      "TruthfulQA benchmark reports",
    ],
    cta: "Start Pro Trial",
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    tagline: "Unlimited scale, private deployment, compliance.",
    features: [
      "Unlimited requests",
      "Data center crawler access",
      "Private deployment option",
      "Federal/CISA compliance mode",
      "SLA guarantee",
      "Dedicated success engineer",
    ],
    cta: "Contact Sales",
  },
];

export function planLabel(plan: string | null | undefined): string {
  switch (plan) {
    case "pro":
      return "Pro";
    case "enterprise":
      return "Enterprise";
    default:
      return "Free";
  }
}
