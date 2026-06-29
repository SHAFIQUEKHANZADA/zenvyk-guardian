import { Construction } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ComingSoon({
  title,
  description,
  icon: Icon = Construction,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-muted-2">
        <Icon className="h-7 w-7" />
      </span>
      <Badge tone="primary" className="mb-3">
        Coming soon
      </Badge>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted">
        {description ??
          "This part of Guardian is on the roadmap. Check back soon — it isn't part of the current MVP."}
      </p>
    </div>
  );
}
