"use client";

import { useParams } from "next/navigation";
import { MessagesView } from "@/components/messages-view";
import { PageShell } from "@/components/page-shell";

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <PageShell>
      <MessagesView conversationId={id} />
    </PageShell>
  );
}
