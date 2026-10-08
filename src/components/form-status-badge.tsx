import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FormStatus } from "@/lib/types";

export const STATUS_LABELS: Record<FormStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  CLOSED: "Closed",
};

const STATUS_STYLES: Record<FormStatus, string> = {
  DRAFT: "bg-secondary text-secondary-foreground",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  CLOSED: "bg-amber-100 text-amber-900",
};

export function FormStatusBadge({ status, className }: { status: FormStatus; className?: string }) {
  return (
    <Badge className={cn(STATUS_STYLES[status], className)}>
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          status === "PUBLISHED" ? "bg-emerald-600" : status === "CLOSED" ? "bg-amber-600" : "bg-muted-foreground"
        )}
      />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
