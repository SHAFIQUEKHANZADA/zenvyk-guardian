"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";

/**
 * Shows a success toast when the user returns from Checkout with ?upgraded=1,
 * then strips the query param so it doesn't reappear on refresh.
 */
export function UpgradeToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (params.get("upgraded") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShow(true);
      router.replace(pathname, { scroll: false });
      const t = setTimeout(() => setShow(false), 6000);
      return () => clearTimeout(t);
    }
  }, [params, router, pathname]);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-pass/30 bg-surface p-4 shadow-xl shadow-black/40">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-pass" />
      <div className="flex-1">
        <p className="text-sm font-semibold">Welcome to Pro 🎉</p>
        <p className="mt-0.5 text-xs text-muted">
          Your 14-day trial has started. The full 5-model ensemble is now
          unlocked.
        </p>
      </div>
      <button
        onClick={() => setShow(false)}
        className="text-muted-2 hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
