import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  getStripe,
  isStripeConfigured,
  STRIPE_WEBHOOK_SECRET,
  subscriptionPeriodEnd,
} from "@/lib/stripe/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

// Stripe signature verification needs the Node runtime + the raw request body.
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isStripeConfigured || !STRIPE_WEBHOOK_SECRET || !isAdminConfigured) {
    return NextResponse.json(
      { error: "Billing webhook is not configured." },
      { status: 500 },
    );
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  // Raw body is required for signature verification.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const customerId = session.customer as string | null;
        const subscriptionId = session.subscription as string | null;
        if (!userId) break;

        let status: string | null = null;
        let periodEnd: string | null = null;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          status = sub.status;
          periodEnd = subscriptionPeriodEnd(sub);
        }

        await admin.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan: "pro",
            status,
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
        await admin.from("profiles").update({ plan: "pro" }).eq("id", userId);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(admin, sub);
        if (!userId) break;

        // Keep the plan; reflect the latest status + period end. A canceled or
        // past_due sub keeps plan='pro' but shows its status.
        await admin
          .from("subscriptions")
          .update({
            status: sub.status,
            current_period_end: subscriptionPeriodEnd(sub),
            stripe_customer_id: sub.customer as string,
            stripe_subscription_id: sub.id,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(admin, sub);
        if (!userId) break;

        await admin
          .from("subscriptions")
          .update({
            plan: "free",
            status: sub.status,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        await admin.from("profiles").update({ plan: "free" }).eq("id", userId);
        break;
      }

      default:
        // Unhandled event types are acknowledged so Stripe stops retrying.
        break;
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err);
    return NextResponse.json({ error: "Handler error." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/** Find the Supabase user_id for a subscription (metadata first, then DB). */
async function resolveUserId(
  admin: ReturnType<typeof createAdminClient>,
  sub: Stripe.Subscription,
): Promise<string | null> {
  const fromMeta = sub.metadata?.user_id;
  if (fromMeta) return fromMeta;

  const { data } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  return data?.user_id ?? null;
}
