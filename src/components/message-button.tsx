"use client";

import { MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { openConversation } from "@/lib/api";

export function MessageButton({ userId, label = "Message" }: { userId: string; label?: string }) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  async function open() {
    try {
      setOpening(true);
      const conversation = await openConversation(userId);
      router.push(`/messages/${conversation.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the conversation.");
      setOpening(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={() => void open()} disabled={opening}>
      <MessageSquare className="size-4" />
      {label}
    </Button>
  );
}
