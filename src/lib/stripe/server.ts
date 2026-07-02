// NOTE: only import this module from server route handlers. STRIPE_SECRET_KEY
// is not a NEXT_PUBLIC_ var, so it is never bundled into client code.
import Stripe from "stripe";

/**
 * Server-side Stripe client. The secret key is read from env and NEVER
 * exposed to the browser. Throws a clear error if billing isn't configured.
 */
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
export const STRIPE_PRO_PRICE_ID =
  process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "";

export const isStripeConfigured = STRIPE_SECRET_KEY.length > 0;

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (!_stripe) {
    // apiVersion omitted → uses the version pinned by the installed SDK.
    _stripe = new Stripe(STRIPE_SECRET_KEY);
  }
  return _stripe;
}

/**
 * `current_period_end` moved onto the subscription *item* in newer Stripe API
 * versions; read it defensively from either location. Returns an ISO string.
 */
export function subscriptionPeriodEnd(
  subscription: Stripe.Subscription,
): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = subscription as any;
  const fromSub: number | undefined = sub.current_period_end;
  const fromItem: number | undefined = sub.items?.data?.[0]?.current_period_end;
  const unix = fromSub ?? fromItem;
  return unix ? new Date(unix * 1000).toISOString() : null;
}
