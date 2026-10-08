"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { searchUsers } from "@/lib/api";
import type { AuthUser } from "@/lib/types";

export function UserPicker({
  excludeIds,
  onPick,
  disabled,
  placeholder = "Search people by name or email",
}: {
  excludeIds: string[];
  onPick: (user: AuthUser) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [term, setTerm] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(text.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [text]);

  const results = useQuery({
    queryKey: ["user-search", term],
    queryFn: () => searchUsers(term),
    enabled: term.length >= 2,
    staleTime: 30_000,
  });

  const excluded = new Set(excludeIds);
  const matches = (results.data ?? []).filter((user) => !excluded.has(user.id));
  const showList = text.trim().length >= 2 && term.length >= 2;

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        disabled={disabled}
        className="pl-8"
      />
      {showList ? (
        <div className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md">
          {results.isLoading ? <p className="px-2 py-1.5 text-sm text-muted-foreground">Searching...</p> : null}
          {results.isError ? <p className="px-2 py-1.5 text-sm text-red-700">Could not search people.</p> : null}
          {results.data && matches.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">No matching people.</p>
          ) : null}
          {matches.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => {
                onPick(user);
                setText("");
                setTerm("");
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
            >
              <UserPlus className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{user.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
