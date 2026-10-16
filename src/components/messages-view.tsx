"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { UserPicker } from "@/components/user-picker";
import {
  getConversation,
  getConversations,
  getMessages,
  markConversationRead,
  openConversation,
  sendMessage,
} from "@/lib/api";
import type { Message, MessagePage } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 4000;

function formatTime(value: string) {
  const date = new Date(value);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { day: "numeric", month: "short" });
}

function ConversationList({ activeId }: { activeId?: string }) {
  const router = useRouter();
  const conversations = useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
    refetchInterval: 15_000,
  });

  async function startWith(userId: string) {
    try {
      const conversation = await openConversation(userId);
      router.push(`/messages/${conversation.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the conversation.");
    }
  }

  const items = conversations.data ?? [];

  return (
    <div className="flex min-h-0 flex-col">
      <div className="border-b border-border p-3">
        <UserPicker excludeIds={[]} onPick={(user) => void startWith(user.id)} placeholder="Message someone new" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {conversations.isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : null}
        {conversations.isError ? (
          <p className="p-4 text-sm text-red-700">
            {conversations.error instanceof Error ? conversations.error.message : "Could not load conversations."}
          </p>
        ) : null}
        {conversations.data && items.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No conversations yet. Search for someone above to start one.</p>
        ) : null}
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/messages/${item.id}`}
                className={cn(
                  "flex items-start gap-3 border-b border-border px-3 py-3 hover:bg-muted",
                  item.id === activeId && "bg-muted"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={cn("truncate text-sm", item.unreadCount > 0 ? "font-semibold" : "font-medium")}>
                      {item.otherUser?.name ?? "Deleted user"}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatTime(item.lastMessageAt)}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{item.lastMessage?.body ?? ""}</p>
                    {item.unreadCount > 0 ? (
                      <span
                        className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold text-white"
                        aria-label={`${item.unreadCount} unread`}
                      >
                        {item.unreadCount > 99 ? "99+" : item.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Thread({ id }: { id: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");

  const conversation = useQuery({
    queryKey: ["conversation", id],
    queryFn: () => getConversation(id),
  });

  const messages = useInfiniteQuery({
    queryKey: ["messages", id],
    queryFn: ({ pageParam }) => getMessages(id, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    refetchInterval: 5_000,
    enabled: conversation.isSuccess,
  });

  const ordered: Message[] = [...(messages.data?.pages ?? [])].reverse().flatMap((page) => page.messages);
  const newestId = ordered.at(-1)?.id;

  useEffect(() => {
    if (!conversation.isSuccess) {
      return;
    }

    markConversationRead(id)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ["messages-unread"] });
        void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      })
      .catch(() => {});
  }, [id, newestId, conversation.isSuccess, queryClient]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [newestId]);

  const send = useMutation({
    mutationFn: (body: string) => sendMessage(id, body),
    onSuccess: (message) => {
      setText("");
      queryClient.setQueryData<{ pages: MessagePage[]; pageParams: (string | null)[] }>(["messages", id], (data) => {
        if (!data || data.pages.length === 0) {
          return data;
        }

        const [first, ...rest] = data.pages;
        if (first.messages.some((item) => item.id === message.id)) {
          return data;
        }

        return { ...data, pages: [{ ...first, messages: [...first.messages, message] }, ...rest] };
      });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not send the message.");
    },
  });

  function submit() {
    const body = text.trim();
    if (!body || send.isPending) {
      return;
    }

    send.mutate(body);
  }

  if (conversation.isError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-red-700">
        {conversation.error instanceof Error ? conversation.error.message : "Could not load this conversation."}
      </div>
    );
  }

  const other = conversation.data?.otherUser;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link href="/messages" className="text-muted-foreground hover:text-foreground md:hidden" aria-label="Back to conversations">
          <ArrowLeft className="size-5" />
        </Link>
        {conversation.isLoading ? (
          <Skeleton className="h-9 w-48" />
        ) : (
          <div className="min-w-0">
            <p className="truncate font-semibold">{other?.name ?? "Deleted user"}</p>
            {other ? <p className="truncate text-xs text-muted-foreground">{other.email}</p> : null}
          </div>
        )}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.hasNextPage ? (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void messages.fetchNextPage()}
              disabled={messages.isFetchingNextPage}
            >
              {messages.isFetchingNextPage ? "Loading..." : "Load earlier messages"}
            </Button>
          </div>
        ) : null}
        {messages.isLoading ? <p className="text-center text-sm text-muted-foreground">Loading messages...</p> : null}
        {messages.data && ordered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No messages yet. Say hello.</p>
        ) : null}
        {ordered.map((message) => {
          const mine = message.senderId === user?.id;
          return (
            <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                  mine ? "rounded-br-sm bg-brand text-white" : "rounded-bl-sm bg-muted text-foreground"
                )}
              >
                <p className="whitespace-pre-wrap break-words">{message.body}</p>
                <p className={cn("mt-1 text-right text-[11px]", mine ? "text-white/75" : "text-muted-foreground")}>
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form
        className="flex items-end gap-2 border-t border-border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={other ? `Message ${other.name}` : "Write a message"}
          aria-label="Message"
          maxLength={MAX_LENGTH}
          rows={1}
          className="max-h-40 min-h-10 resize-none"
          disabled={!conversation.isSuccess || !other}
        />
        <Button type="submit" size="icon" disabled={!text.trim() || send.isPending || !other} aria-label="Send">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}

export function MessagesView({ conversationId }: { conversationId?: string }) {
  return (
    <div className="grid h-[calc(100vh-8.5rem)] min-h-[28rem] overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:grid-cols-[20rem_1fr]">
      <div className={cn("min-h-0 border-r border-border", conversationId ? "hidden md:flex" : "flex", "flex-col")}>
        <ConversationList activeId={conversationId} />
      </div>
      <div className={cn("min-h-0 flex-col", conversationId ? "flex" : "hidden md:flex")}>
        {conversationId ? (
          <Thread key={conversationId} id={conversationId} />
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState
              icon={MessageSquare}
              title="Your messages"
              description="Pick a conversation, or search for someone to start a new one."
            />
          </div>
        )}
      </div>
    </div>
  );
}
