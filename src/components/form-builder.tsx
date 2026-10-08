"use client";

import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Copy,
  Eye,
  ExternalLink,
  GripVertical,
  Link2,
  MoreVertical,
  Pencil,
  Plus,
  Rows3,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SortableFieldCard } from "@/components/field-editor";
import { FieldTypeMenu } from "@/components/field-type-menu";
import { FormRenderer } from "@/components/form-renderer";
import { FormStatusBadge } from "@/components/form-status-badge";
import { RespondentLayout } from "@/components/respondent-layout";
import { RichTextEditor } from "@/components/rich-text-editor";
import { ShareDialog } from "@/components/share-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { closeForm, deleteForm, duplicateForm, publishForm, updateForm } from "@/lib/api";
import { createField, createOption, createSection } from "@/lib/field-types";
import { applyDrag, normalizeForm, toPayload, validateDraft } from "@/lib/form-draft";
import type { FieldType, FormField, FormRecord, FormSection } from "@/lib/types";
import { cn } from "@/lib/utils";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function copyField(field: FormField): FormField {
  return {
    ...field,
    id: crypto.randomUUID(),
    options: field.options.map((option) => ({ ...createOption(option.label) })),
  };
}

function SectionBlock({
  section,
  index,
  total,
  selectedId,
  onSelect,
  onChange,
  onDelete,
  onAddField,
}: {
  section: FormSection;
  index: number;
  total: number;
  selectedId: string | null;
  onSelect: (fieldId: string) => void;
  onChange: (section: FormSection) => void;
  onDelete: () => void;
  onAddField: (type: FieldType) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: `section:${section.id}`,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `section-drop:${section.id}` });

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("space-y-3", isDragging && "relative z-20 opacity-80")}
    >
      {total > 1 ? (
        <div>
          <span className="inline-block rounded-t-lg bg-brand px-3 py-1 text-xs font-semibold text-white">
            Section {index + 1} of {total}
          </span>
          <div className="overflow-hidden rounded-xl rounded-tl-none border border-t-4 border-border border-t-brand bg-card shadow-sm">
            <div className="flex items-start gap-2 p-4">
              <button
                type="button"
                ref={setActivatorNodeRef}
                className="mt-2 cursor-grab touch-none rounded p-1 text-muted-foreground/60 transition hover:bg-muted hover:text-foreground active:cursor-grabbing"
                aria-label="Reorder section"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="size-4" />
              </button>
              <div className="min-w-0 flex-1 space-y-1">
                <RichTextEditor
                  compact
                  variant="heading"
                  label="Section title"
                  placeholder="Section title"
                  value={section.titleDoc}
                  fallbackText={section.title}
                  onChange={(titleDoc, plain) => onChange({ ...section, titleDoc, title: plain })}
                />
                <RichTextEditor
                  compact
                  label="Section description"
                  placeholder="Section description (optional)"
                  value={section.descriptionDoc}
                  onChange={(descriptionDoc) => onChange({ ...section, descriptionDoc })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onDelete}
                aria-label="Delete section"
                className="mt-1 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div
        ref={setDropRef}
        className={cn("space-y-3 rounded-xl transition-colors", isOver && "bg-brand-soft/60 outline-2 outline-dashed outline-brand/40")}
      >
        <SortableContext items={section.fields.map((field) => `field:${field.id}`)} strategy={verticalListSortingStrategy}>
          {section.fields.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
              Drop a question here or add one below.
            </p>
          ) : (
            section.fields.map((field, fieldIndex) => (
              <SortableFieldCard
                key={field.id}
                field={field}
                selected={selectedId === field.id}
                onSelect={() => onSelect(field.id)}
                onChange={(next) => onChange({ ...section, fields: section.fields.map((item) => (item.id === field.id ? next : item)) })}
                onDelete={() => onChange({ ...section, fields: section.fields.filter((item) => item.id !== field.id) })}
                onDuplicate={() => {
                  const copy = copyField(field);
                  const fields = [...section.fields];
                  fields.splice(fieldIndex + 1, 0, copy);
                  onChange({ ...section, fields });
                  onSelect(copy.id);
                }}
              />
            ))
          )}
        </SortableContext>
      </div>

      <FieldTypeMenu
        onSelect={onAddField}
        trigger={
          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed bg-card/60 text-muted-foreground hover:border-brand/50 hover:text-brand"
          />
        }
      >
        <Plus className="size-4" />
        Add question
      </FieldTypeMenu>
    </section>
  );
}

export function FormBuilder({ initialForm }: { initialForm: FormRecord }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(() => normalizeForm(initialForm));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const isOwner = draft.role !== "EDITOR";
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const edit = (updater: (form: FormRecord) => FormRecord) => {
    setDraft((current) => updater(current));
    setDirty(true);
  };

  const remember = (form: FormRecord) => {
    const next = normalizeForm(form);
    setDraft(next);
    setDirty(false);
    queryClient.setQueryData(["form", next.id], next);
    void queryClient.invalidateQueries({ queryKey: ["forms"] });
    return next;
  };

  const save = async (notify = true) => {
    const problem = validateDraft(draft);
    if (problem) {
      toast.error(problem);
      return null;
    }

    try {
      setSaving(true);
      const saved = remember(await updateForm(draft.id, toPayload(draft)));
      if (notify) {
        toast.success("Form saved");
      }

      return saved;
    } catch (error) {
      toast.error(errorMessage(error, "Could not save the form."));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const persistIfNeeded = async () => (dirty ? save(false) : draft);

  const lifecycle = async (action: (id: string) => Promise<FormRecord>, success: string, failure: string) => {
    setBusy(true);
    try {
      const current = await persistIfNeeded();
      if (!current) {
        return;
      }

      remember(await action(current.id));
      toast.success(success);
    } catch (error) {
      toast.error(errorMessage(error, failure));
    } finally {
      setBusy(false);
    }
  };

  const publicUrl = draft.publicId ? `/f/${draft.publicId}` : null;

  const copyLink = () => {
    if (!publicUrl) {
      return;
    }

    void navigator.clipboard.writeText(`${window.location.origin}${publicUrl}`).then(() => toast.success("Link copied"));
  };

  const onDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    if (!overId) {
      return;
    }

    edit((current) => ({
      ...current,
      sections: applyDrag(current.sections, String(event.active.id), String(overId)),
    }));
  };

  const saveLabel = saving ? "Saving..." : dirty ? "Unsaved changes" : "All changes saved";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <div className="sticky top-14 z-30 border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <h1 className="truncate text-base font-semibold">{draft.title || "Untitled form"}</h1>
            <FormStatusBadge status={draft.status} />
            <span
              className={cn(
                "hidden items-center gap-1.5 text-xs sm:flex",
                dirty ? "text-amber-700" : "text-muted-foreground"
              )}
              aria-live="polite"
            >
              <span className={cn("size-1.5 rounded-full", dirty ? "bg-amber-500" : "bg-emerald-500")} aria-hidden />
              {saveLabel}
            </span>
          </div>

          <div role="tablist" aria-label="Builder view" className="flex rounded-lg bg-muted p-0.5">
            {[
              { id: "edit" as const, label: "Edit", icon: Pencil },
              { id: "preview" as const, label: "Preview", icon: Eye },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={view === tab.id}
                onClick={() => setView(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition hover:text-foreground",
                  view === tab.id && "bg-card text-foreground shadow-sm"
                )}
              >
                <tab.icon className="size-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => void save()} disabled={saving || !dirty}>
              Save
            </Button>
            <Button type="button" variant="outline" onClick={() => setShareOpen(true)}>
              <Users className="size-4" />
              Share
            </Button>
            {draft.status === "PUBLISHED" ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void lifecycle(closeForm, "Form closed", "Could not close the form.")}
              >
                Close form
              </Button>
            ) : (
              <Button
                type="button"
                disabled={busy}
                onClick={() => void lifecycle(publishForm, "Form published", "Could not publish the form.")}
              >
                Publish
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" aria-label="More form actions" />}>
                <MoreVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push(`/forms/${draft.id}/responses`)}>
                  <BarChart3 />
                  Responses
                </DropdownMenuItem>
                {publicUrl ? (
                  <>
                    <DropdownMenuItem onClick={copyLink}>
                      <Link2 />
                      Copy link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.open(publicUrl, "_blank", "noopener")}>
                      <ExternalLink />
                      Open public form
                    </DropdownMenuItem>
                  </>
                ) : null}
                <DropdownMenuItem
                  onClick={() =>
                    void (async () => {
                      const current = await persistIfNeeded();
                      if (!current) {
                        return;
                      }

                      try {
                        const copy = await duplicateForm(current.id);
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
                {isOwner ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {view === "preview" ? (
        <main className="mx-auto w-full max-w-3xl px-4 py-8">
          <p className="mb-3 text-center text-xs font-medium text-muted-foreground">
            Preview — answers are not saved
          </p>
          <RespondentLayout embedded>
            <FormRenderer form={draft} mode="preview" />
          </RespondentLayout>
        </main>
      ) : (
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
          {publicUrl ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm shadow-xs">
              <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                <Link2 className="size-4 shrink-0 text-brand" />
                <a href={publicUrl} target="_blank" rel="noreferrer" className="truncate font-medium text-foreground hover:text-brand hover:underline">
                  {publicUrl}
                </a>
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={copyLink}>
                <Copy className="size-3.5" />
                Copy link
              </Button>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-4 py-2.5 text-center text-sm text-muted-foreground">
              Publish the form to get a shareable link.
            </p>
          )}

          <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-xs">
            <span>
              <span id="limit-one-response" className="block font-medium">
                Limit to one response per browser
              </span>
              <span className="block text-muted-foreground">
                Respondents stay anonymous. Someone using a different browser or clearing their data can still respond again.
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={draft.limitOneResponse}
              aria-labelledby="limit-one-response"
              onClick={() => edit((current) => ({ ...current, limitOneResponse: !current.limitOneResponse }))}
              className={cn(
                "relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                draft.limitOneResponse ? "bg-brand" : "bg-input"
              )}
            >
              <span
                className={cn(
                  "inline-block size-4 rounded-full bg-white shadow transition-transform",
                  draft.limitOneResponse ? "translate-x-4.5" : "translate-x-0.5"
                )}
              />
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="h-2 bg-brand" aria-hidden />
            <div className="space-y-2 p-5">
              <RichTextEditor
                variant="title"
                label="Form title"
                placeholder="Form title"
                value={draft.titleDoc}
                fallbackText={draft.title}
                onChange={(titleDoc, plain) => edit((current) => ({ ...current, titleDoc, title: plain }))}
              />
              <RichTextEditor
                compact
                label="Form description"
                placeholder="Form description"
                value={draft.descriptionDoc}
                fallbackText={draft.description ?? ""}
                onChange={(descriptionDoc, plain) => edit((current) => ({ ...current, descriptionDoc, description: plain }))}
              />
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
            <SortableContext items={draft.sections.map((section) => `section:${section.id}`)} strategy={verticalListSortingStrategy}>
              <div className="space-y-8">
                {draft.sections.map((section, index) => (
                  <SectionBlock
                    key={section.id}
                    section={section}
                    index={index}
                    total={draft.sections.length}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onChange={(next) =>
                      edit((current) => ({
                        ...current,
                        sections: current.sections.map((item) => (item.id === section.id ? next : item)),
                      }))
                    }
                    onDelete={() =>
                      edit((current) => ({
                        ...current,
                        sections: current.sections.filter((item) => item.id !== section.id),
                      }))
                    }
                    onAddField={(type) => {
                      const field = createField(type);
                      edit((current) => ({
                        ...current,
                        sections: current.sections.map((item) =>
                          item.id === section.id ? { ...item, fields: [...item.fields, field] } : item
                        ),
                      }));
                      setSelectedId(field.id);
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button
            type="button"
            variant="ghost"
            className="self-center text-muted-foreground hover:text-brand"
            onClick={() =>
              edit((current) => ({
                ...current,
                sections: [...current.sections, createSection(`Section ${current.sections.length + 1}`)],
              }))
            }
          >
            <Rows3 className="size-4" />
            Add section
          </Button>
        </main>
      )}

      <ShareDialog form={draft} open={shareOpen} onOpenChange={setShareOpen} />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete "${draft.title || "Untitled form"}"?`}
        description="The form, its responses, and any uploaded files will be removed. This cannot be undone."
        confirmLabel="Delete form"
        onConfirm={async () => {
          try {
            await deleteForm(draft.id);
            toast.success("Form deleted");
            router.push("/");
          } catch (error) {
            toast.error(errorMessage(error, "Could not delete the form."));
          }
        }}
      />
    </div>
  );
}
