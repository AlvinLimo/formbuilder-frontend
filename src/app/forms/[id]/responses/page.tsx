"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Inbox } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadCsv, downloadFile, getSubmissions } from "@/lib/api";

async function runDownload(action: () => Promise<void>) {
  try {
    await action();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Could not download the file.");
  }
}

export default function ResponsesPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const submissions = useQuery({
    queryKey: ["submissions", id],
    queryFn: () => getSubmissions(id),
    enabled: Boolean(id),
  });

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href={id ? `/forms/${id}` : "/"}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="size-4" />
            Back to builder
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{submissions.data?.form.title ?? "Responses"}</h1>
          {submissions.data ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {submissions.data.rows.length} {submissions.data.rows.length === 1 ? "response" : "responses"}
            </p>
          ) : null}
        </div>
        {id ? (
          <Button type="button" variant="outline" onClick={() => void runDownload(() => downloadCsv(id))}>
            <Download className="size-4" />
            Export CSV
          </Button>
        ) : null}
      </div>

      {submissions.isLoading ? (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      ) : null}
      {submissions.isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {submissions.error instanceof Error ? submissions.error.message : "Could not load responses."}
        </p>
      ) : null}

      {submissions.data && submissions.data.rows.length === 0 ? (
        <EmptyState icon={Inbox} title="No responses yet" description="Share the public link to start collecting answers." />
      ) : null}

      {submissions.data && submissions.data.rows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Submitted at</th>
                <th className="px-3 py-2 font-medium">Submitted by</th>
                {submissions.data.columns.map((column) => (
                  <th key={column.id} className="px-3 py-2 font-medium">
                    {column.label}
                    {column.deleted ? " (deleted)" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {submissions.data.rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(row.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2 align-top whitespace-nowrap">
                    {row.submittedBy ? (
                      <>
                        <span className="block">{row.submittedBy.name}</span>
                        <span className="block text-xs text-muted-foreground">{row.submittedBy.email}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Anonymous</span>
                    )}
                  </td>
                  {submissions.data?.columns.map((column) => {
                    const file = row.files[column.id];
                    return (
                      <td key={column.id} className="px-3 py-2 align-top">
                        {file && id ? (
                          <button
                            type="button"
                            className="text-left text-primary underline"
                            onClick={() => void runDownload(() => downloadFile(id, file.path, file.fileName))}
                          >
                            {file.fileName}
                          </button>
                        ) : (
                          row.answers[column.id]
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </PageShell>
  );
}
