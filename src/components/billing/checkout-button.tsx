"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Spinner } from "@/components/ui/feedback";

/**
 * Starts a Pro Checkout session. POSTs to /api/stripe/checkout; the server
 * verifies auth. If the user isn't logged in (401) we send them to /signup.
 */
export function CheckoutButton({
  children,
  className,
  variant,
  size,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });

      if (res.status === 401) {
        window.location.href = "/signup?redirectedFrom=/pricing";
        return;
      }

      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not start checkout.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <Button
        onClick={start}
        disabled={loading}
        variant={variant}
        size={size}
        className={className}
      >
        {loading ? <Spinner /> : null}
        {children}
      </Button>
      {error ? <p className="mt-2 text-xs text-blocked">{error}</p> : null}
    </div>
  );
}
