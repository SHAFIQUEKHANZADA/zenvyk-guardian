import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getStripe,
  isStripeConfigured,
  STRIPE_PRO_PRICE_ID,
} from "@/lib/stripe/server";

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout Session for the Pro subscription (14-day trial)
 * for the currently signed-in user, and returns the hosted checkout URL.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured || !STRIPE_PRO_PRICE_ID) {
    return NextResponse.json(
      { error: "Billing is not configured." },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // The client redirects to /signup on 401.
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const origin =
    request.headers.get("origin") ??
    new URL(request.url).origin;

  try {
    const stripe = getStripe();

    // Reuse an existing Stripe customer if we already have one.
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: STRIPE_PRO_PRICE_ID, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { user_id: user.id },
      },
      metadata: { user_id: user.id },
      success_url: `${origin}/dashboard?upgraded=1`,
      cancel_url: `${origin}/pricing`,
      ...(existing?.stripe_customer_id
        ? { customer: existing.stripe_customer_id }
        : { customer_email: user.email ?? undefined }),
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 },
    );
  }
}
