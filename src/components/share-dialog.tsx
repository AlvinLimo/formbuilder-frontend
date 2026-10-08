"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";
import { UserPicker } from "@/components/user-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  addAssignments,
  addCollaborators,
  getAssignments,
  getCollaborators,
  removeAssignment,
  removeCollaborator,
} from "@/lib/api";
import type { AuthUser, FormRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function PersonRow({
  user,
  meta,
  badge,
  onRemove,
  removeLabel,
}: {
  user: AuthUser;
  meta?: React.ReactNode;
  badge?: React.ReactNode;
  onRemove?: () => void;
  removeLabel: string;
}) {
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{user.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {user.email}
          {meta ? <> · {meta}</> : null}
        </span>
      </span>
      {badge}
      {onRemove ? (
        <Button type="button" variant="ghost" size="icon-sm" aria-label={removeLabel} onClick={onRemove}>
          <X className="size-4" />
        </Button>
      ) : null}
    </li>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function ShareDialog({
  form,
  open,
  onOpenChange,
}: {
  form: Pick<FormRecord, "id" | "status" | "role" | "owner">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const isOwner = form.role !== "EDITOR";
  const published = form.status === "PUBLISHED";

  const assignments = useQuery({
    queryKey: ["assignments", form.id],
    queryFn: () => getAssignments(form.id),
    enabled: open,
  });
  const collaborators = useQuery({
    queryKey: ["collaborators", form.id],
    queryFn: () => getCollaborators(form.id),
    enabled: open,
  });

  const assign = useMutation({
    mutationFn: (user: AuthUser) => addAssignments(form.id, [user.id]),
    onSuccess: (data, user) => {
      queryClient.setQueryData(["assignments", form.id], data);
      toast.success(`Sent to ${user.name}`);
    },
    onError: (error) => toast.error(errorMessage(error, "Could not send the form.")),
  });
  const unassign = useMutation({
    mutationFn: (userId: string) => removeAssignment(form.id, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments", form.id] }),
    onError: (error) => toast.error(errorMessage(error, "Could not remove the person.")),
  });
  const addEditor = useMutation({
    mutationFn: (user: AuthUser) => addCollaborators(form.id, [user.id]),
    onSuccess: (data, user) => {
      queryClient.setQueryData(["collaborators", form.id], data);
      toast.success(`${user.name} can now edit this form`);
    },
    onError: (error) => toast.error(errorMessage(error, "Could not add the collaborator.")),
  });
  const removeEditor = useMutation({
    mutationFn: (userId: string) => removeCollaborator(form.id, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["collaborators", form.id] }),
    onError: (error) => toast.error(errorMessage(error, "Could not remove the collaborator.")),
  });

  const assignees = assignments.data ?? [];
  const editors = collaborators.data ?? [];
  const submitted = assignees.filter((item) => item.status === "SUBMITTED").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Share form</DialogTitle>
          <DialogDescription>Send this form to people to fill in, or invite colleagues to edit it.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Section
            title="Send to fill in"
            description="They will see it in their inbox. You can track who has responded."
          >
            {published ? (
              <UserPicker
                excludeIds={assignees.map((item) => item.id)}
                onPick={(user) => assign.mutate(user)}
                disabled={assign.isPending}
              />
            ) : (
              <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                Publish the form before sending it to people.
              </p>
            )}
            {assignments.isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
            {assignees.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {submitted} of {assignees.length} responded
                </p>
                <ul className="divide-y divide-border">
                  {assignees.map((item) => (
                    <PersonRow
                      key={item.id}
                      user={item}
                      meta={item.submittedAt ? `responded ${new Date(item.submittedAt).toLocaleDateString()}` : undefined}
                      badge={
                        <Badge
                          className={cn(
                            item.status === "SUBMITTED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                          )}
                        >
                          {item.status === "SUBMITTED" ? "Submitted" : "Pending"}
                        </Badge>
                      }
                      removeLabel={`Stop sending to ${item.name}`}
                      onRemove={() => unassign.mutate(item.id)}
                    />
                  ))}
                </ul>
              </>
            ) : null}
          </Section>

          <Section
            title="Collaborators"
            description={
              isOwner
                ? "Collaborators can edit, publish, send, and view responses. Only you can delete the form."
                : "Only the owner can change who collaborates on this form."
            }
          >
            {isOwner ? (
              <UserPicker
                excludeIds={editors.map((item) => item.id)}
                onPick={(user) => addEditor.mutate(user)}
                disabled={addEditor.isPending}
              />
            ) : null}
            <ul className="divide-y divide-border">
              {form.owner ? (
                <PersonRow user={form.owner} badge={<Badge variant="secondary">Owner</Badge>} removeLabel="" />
              ) : null}
              {editors.map((item) => (
                <PersonRow
                  key={item.id}
                  user={item}
                  badge={<Badge variant="outline">Editor</Badge>}
                  removeLabel={`Remove ${item.name}`}
                  onRemove={isOwner ? () => removeEditor.mutate(item.id) : undefined}
                />
              ))}
            </ul>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
