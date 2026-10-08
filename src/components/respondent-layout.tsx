import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function RespondentLayout({ children, embedded = false }: { children: React.ReactNode; embedded?: boolean }) {
  return (
    <div className={cn("bg-background", embedded ? "overflow-hidden rounded-2xl border border-border" : "min-h-screen")}>
      <div className="relative h-40 overflow-hidden bg-brand sm:h-48">
        <div
          aria-hidden
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 30%, rgba(255,255,255,0.5) 0, transparent 45%), radial-gradient(circle at 85% 0%, rgba(0,0,0,0.35) 0, transparent 50%)",
          }}
        />
        <div className="relative mx-auto flex max-w-2xl items-start px-4 pt-5">
          <span className="rounded-lg bg-white px-2 py-1 shadow-sm">
            <Image src={BRAND.logo} alt={BRAND.name} width={90} height={30} priority={!embedded} />
          </span>
        </div>
      </div>
      <div className={cn("relative mx-auto -mt-20 max-w-2xl px-4", embedded ? "pb-8" : "pb-16")}>{children}</div>
    </div>
  );
}

export function StatusScreen({
  icon: Icon,
  tone = "brand",
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  tone?: "brand" | "success" | "muted";
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center shadow-sm">
      <div
        className={cn(
          "mx-auto flex size-14 items-center justify-center rounded-full",
          tone === "success" && "bg-emerald-100 text-emerald-700",
          tone === "brand" && "bg-brand-soft text-brand",
          tone === "muted" && "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="size-7" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
