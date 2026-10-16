"use client";

import { MessagesView } from "@/components/messages-view";
import { PageShell } from "@/components/page-shell";

export default function MessagesPage() {
  return (
    <PageShell>
      <MessagesView />
    </PageShell>
  );
}
