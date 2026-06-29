import { cn } from "@/lib/utils";

/** Emerald hexagon mark with a "Z" — the Zenvyk Guardian glyph. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("h-8 w-8", className)}
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="gd-logo" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <path
        d="M20 2.5 34.5 11v18L20 37.5 5.5 29V11L20 2.5Z"
        fill="url(#gd-logo)"
      />
      <path
        d="M20 2.5 34.5 11v18L20 37.5 5.5 29V11L20 2.5Z"
        stroke="#6ee7b7"
        strokeOpacity="0.5"
        strokeWidth="1"
      />
      <path
        d="M14 14.5h12l-9 11h9"
        stroke="#06281f"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Wordmark + glyph.
 * `tone="light"` renders dark text (for the light landing page);
 * default renders light text (for the dark dashboard / auth).
 */
export function Logo({
  className,
  showText = true,
  tone = "dark",
}: {
  className?: string;
  showText?: boolean;
  tone?: "dark" | "light";
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      {showText ? (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "text-sm font-bold tracking-[0.12em]",
              tone === "light" ? "text-slate-900" : "text-white",
            )}
          >
            ZENVYK
          </span>
          <span className="text-[10px] font-semibold tracking-[0.34em] text-[var(--accent)]">
            GUARDIAN
          </span>
        </span>
      ) : null}
    </div>
  );
}
