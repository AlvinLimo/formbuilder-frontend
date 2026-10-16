"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { getUnreadMessageCount } from "@/lib/api";

export function useUnreadMessages() {
  const { status } = useAuth();
  return useQuery({
    queryKey: ["messages-unread"],
    queryFn: getUnreadMessageCount,
    enabled: status === "authenticated",
    refetchInterval: 30_000,
  });
}

export function MessagesLink() {
  const unread = useUnreadMessages();
  const count = unread.data?.count ?? 0;

  return (
    <Link
      href="/messages"
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      Messages
      {count > 0 ? (
        <span
          className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold text-white"
          aria-label={`${count} unread`}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
