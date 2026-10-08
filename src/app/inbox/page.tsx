"use client";

import { Inbox as InboxIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { useInbox } from "@/components/inbox-link";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { InboxItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS: Record<InboxItem["status"], { label: string; className: string }> = {
  PENDING: { label: "To do", className: "bg-amber-100 text-amber-900" },
  SUBMITTED: { label: "Submitted", className: "bg-emerald-100 text-emerald-800" },
  CLOSED: { label: "Closed", className: "bg-secondary text-secondary-foreground" },
};

export default function InboxPage() {
  const inbox = useInbox();
  const items = inbox.data?.assignments ?? [];

  return (
    <PageShell width="narrow">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Inbox</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Forms sent to me</h1>
        <p className="mt-1 text-sm text-muted-foreground">Forms colleagues have asked you to fill in.</p>
      </div>

      {inbox.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : null}

      {inbox.isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {inbox.error instanceof Error ? inbox.error.message : "Could not load your inbox."}
        </p>
      ) : null}

      {inbox.data && items.length === 0 ? (
        <EmptyState icon={InboxIcon} title="Nothing here yet" description="When someone sends you a form, it will show up here." />
      ) : null}

      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item) => {
            const status = STATUS[item.status];
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-semibold">{item.form.title || "Untitled form"}</h2>
                    <Badge className={status.className}>{status.label}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {item.assignedBy ? `From ${item.assignedBy.name} · ` : ""}
                    Sent {new Date(item.assignedAt).toLocaleDateString()}
                    {item.submittedAt ? ` · Submitted ${new Date(item.submittedAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
                {item.status === "PENDING" && item.form.publicId ? (
                  <Link href={`/f/${item.form.publicId}`} className={cn(buttonVariants({ size: "sm" }))}>
                    Fill in
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </PageShell>
  );
}
