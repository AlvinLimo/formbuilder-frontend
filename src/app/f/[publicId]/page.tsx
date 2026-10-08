"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, FileQuestion, Lock } from "lucide-react";
import { useParams } from "next/navigation";
import { FormRenderer } from "@/components/form-renderer";
import { RespondentLayout, StatusScreen } from "@/components/respondent-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicForm } from "@/lib/api";

export default function PublicFormPage() {
  const params = useParams<{ publicId: string }>();
  const publicId = Array.isArray(params.publicId) ? params.publicId[0] : params.publicId;
  const form = useQuery({
    queryKey: ["public-form", publicId],
    queryFn: () => getPublicForm(publicId),
    enabled: Boolean(publicId),
    retry: false,
  });

  return (
    <RespondentLayout>
      {form.isLoading ? (
        <div className="space-y-4">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-8 shadow-sm">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="space-y-3 rounded-xl border border-border bg-card p-6">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : null}
      {form.isError ? (
        <StatusScreen
          icon={FileQuestion}
          tone="muted"
          title="Form not available"
          description="This link does not open a published form. Check the link with the person who shared it."
        />
      ) : null}
      {form.data?.status === "CLOSED" ? (
        <StatusScreen
          icon={Lock}
          title={form.data.title || "This form"}
          description="This form is closed. Responses are no longer accepted."
        />
      ) : null}
      {form.data?.status === "PUBLISHED" && form.data.hasResponded ? (
        <StatusScreen
          icon={CheckCircle2}
          tone="success"
          title="You have already responded"
          description="This form accepts one response per person. Thank you for taking part."
        />
      ) : null}
      {form.data && form.data.status === "PUBLISHED" && !form.data.hasResponded ? (
        <FormRenderer
          form={form.data}
          mode="live"
          publicId={form.data.publicId}
          allowAnotherResponse={!form.data.limitOneResponse && !form.data.assigned}
        />
      ) : null}
    </RespondentLayout>
  );
}
