"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { getInbox } from "@/lib/api";

export function useInbox() {
  const { status } = useAuth();
  return useQuery({
    queryKey: ["inbox"],
    queryFn: getInbox,
    enabled: status === "authenticated",
    refetchInterval: 60_000,
  });
}

export function InboxLink() {
  const inbox = useInbox();
  const pending = inbox.data?.pendingCount ?? 0;

  return (
    <Link
      href="/inbox"
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      Inbox
      {pending > 0 ? (
        <span
          className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold text-white"
          aria-label={`${pending} pending`}
        >
          {pending > 99 ? "99+" : pending}
        </span>
      ) : null}
    </Link>
  );
}
