"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, FileText, Link2, MoreVertical, Plus, Search, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FormStatusBadge } from "@/components/form-status-badge";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { closeForm, createForm, deleteForm, duplicateForm, listForms, publishForm } from "@/lib/api";
import { questionCount } from "@/lib/field-types";
import type { FormRecord, FormStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS: { id: "ALL" | FormStatus; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "DRAFT", label: "Drafts" },
  { id: "PUBLISHED", label: "Published" },
  { id: "CLOSED", label: "Closed" },
];

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function FormCard({
  form,
  onChanged,
  onDelete,
}: {
  form: FormRecord;
  onChanged: () => Promise<void>;
  onDelete: (form: FormRecord) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const count = questionCount(form);
  const shared = form.role === "EDITOR";

  const run = async (action: () => Promise<unknown>, success: string, failure: string) => {
    setBusy(true);
    try {
      await action();
      await onChanged();
      toast.success(success);
    } catch (error) {
      toast.error(errorMessage(error, failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md">
      <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-brand opacity-0 transition group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <FormStatusBadge status={form.status} />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" className="relative z-10 -mt-1 -mr-2" aria-label={`More actions for ${form.title}`} />}
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {form.publicId ? (
              <DropdownMenuItem
                onClick={() =>
                  void navigator.clipboard
                    .writeText(`${window.location.origin}/f/${form.publicId}`)
                    .then(() => toast.success("Link copied"))
                }
              >
                <Link2 />
                Copy link
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onClick={() =>
                void (async () => {
                  try {
                    const copy = await duplicateForm(form.id);
                    await onChanged();
                    toast.success("Form duplicated");
                    router.push(`/forms/${copy.id}`);
                  } catch (error) {
                    toast.error(errorMessage(error, "Could not duplicate the form."));
                  }
                })()
              }
            >
              <Copy />
              Duplicate
            </DropdownMenuItem>
            {shared ? null : (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => onDelete(form)}>
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {shared ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Badge variant="outline">
            <Users />
            Shared with you
          </Badge>
          {form.owner ? <span className="truncate">by {form.owner.name}</span> : null}
        </p>
      ) : null}

      <h2 className="mt-3 line-clamp-2 text-lg font-semibold leading-snug">
        <Link href={`/forms/${form.id}`} className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50">
          {form.title || "Untitled form"}
        </Link>
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {count} {count === 1 ? "question" : "questions"}
        {form.updatedAt ? ` · Updated ${new Date(form.updatedAt).toLocaleDateString()}` : ""}
      </p>

      <div className="relative z-10 mt-5 flex flex-wrap gap-2 pt-1">
        {form.status === "PUBLISHED" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void run(() => closeForm(form.id), "Form closed", "Could not close the form.")}
          >
            Close
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void run(() => publishForm(form.id), "Form published", "Could not publish the form.")}
          >
            Publish
          </Button>
        )}
        <Button type="button" size="sm" variant="outline" onClick={() => router.push(`/forms/${form.id}/responses`)}>
          Responses
        </Button>
      </div>
    </article>
  );
}

export default function HomePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const forms = useQuery({ queryKey: ["forms"], queryFn: listForms });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | FormStatus>("ALL");
  const [pendingDelete, setPendingDelete] = useState<FormRecord | null>(null);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["forms"] });
  };

  const create = useMutation({
    mutationFn: () => createForm({ title: "Untitled form", description: "" }),
    onSuccess: (form) => router.push(`/forms/${form.id}`),
    onError: (error) => toast.error(errorMessage(error, "Could not create a form.")),
  });

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (forms.data ?? []).filter(
      (form) => (filter === "ALL" || form.status === filter) && (!term || form.title.toLowerCase().includes(term))
    );
  }, [forms.data, search, filter]);

  const newFormButton = (label: string) => (
    <Button type="button" onClick={() => create.mutate()} disabled={create.isPending}>
      <Plus className="size-4" />
      {create.isPending ? "Creating..." : label}
    </Button>
  );

  const hasForms = Boolean(forms.data && forms.data.length > 0);

  return (
    <PageShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">CIC workspace</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Your forms</h1>
          <p className="mt-1 text-sm text-muted-foreground">Build forms, share a link, and collect responses.</p>
        </div>
        {newFormButton("New form")}
      </div>

      {hasForms ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search forms"
              aria-label="Search forms"
              className="bg-card pl-8"
            />
          </div>
          <div role="group" aria-label="Filter by status" className="flex gap-1 rounded-lg bg-muted p-1">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={cn(
                  "rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition hover:text-foreground",
                  filter === item.id && "bg-card text-foreground shadow-sm"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {forms.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="space-y-3 rounded-2xl border border-border bg-card p-5">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-40" />
            </div>
          ))}
        </div>
      ) : null}

      {forms.isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage(forms.error, "Could not load forms. Start the API and refresh.")}
        </p>
      ) : null}

      {forms.data && !hasForms ? (
        <EmptyState
          icon={FileText}
          title="No forms yet"
          description="Create your first form to start collecting responses from customers and staff."
          action={newFormButton("Create your first form")}
        />
      ) : null}

      {hasForms && visible.length === 0 ? (
        <EmptyState icon={Search} title="No matching forms" description="Try a different search or status filter." />
      ) : null}

      {visible.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((form) => (
            <FormCard key={form.id} form={form} onChanged={refresh} onDelete={setPendingDelete} />
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete "${pendingDelete?.title ?? ""}"?`}
        description="The form, its responses, and any uploaded files will be removed. This cannot be undone."
        confirmLabel="Delete form"
        onConfirm={async () => {
          if (!pendingDelete) {
            return;
          }

          try {
            await deleteForm(pendingDelete.id);
            await refresh();
            toast.success("Form deleted");
          } catch (error) {
            toast.error(errorMessage(error, "Could not delete the form."));
          }
        }}
      />
    </PageShell>
  );
}
