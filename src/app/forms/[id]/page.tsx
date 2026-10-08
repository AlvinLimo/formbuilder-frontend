"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { FormBuilder } from "@/components/form-builder";
import { PageShell } from "@/components/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { getForm } from "@/lib/api";

export default function FormEditorPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const form = useQuery({
    queryKey: ["form", id],
    queryFn: () => getForm(id),
    enabled: Boolean(id),
  });

  if (form.data) {
    return <FormBuilder key={form.data.id} initialForm={form.data} />;
  }

  return (
    <PageShell width="narrow">
      {form.isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {form.error instanceof Error ? form.error.message : "Could not open this form."}
        </p>
      ) : (
        <div className="space-y-4" aria-label="Loading form">
          <div className="space-y-3 rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-3 rounded-xl border border-border bg-card p-4">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
