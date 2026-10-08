"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, Circle, Copy, GripVertical, Plus, Square, Trash2, X } from "lucide-react";
import { useState } from "react";
import { FieldTypeMenu } from "@/components/field-type-menu";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FIELD_TYPE_ICONS } from "@/lib/field-icons";
import {
  FIELD_TYPE_LABELS,
  FILE_TYPE_PRESETS,
  changeFieldType,
  createOption,
  isChoiceType,
  isContentType,
} from "@/lib/field-types";
import { docToPlain } from "@/lib/rich-text";
import type { FieldValidation, FormField, FormOption } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortableBindings = Pick<ReturnType<typeof useSortable>, "attributes" | "listeners" | "setActivatorNodeRef">;

function DragHandle({ label, attributes, listeners, setActivatorNodeRef }: SortableBindings & { label: string }) {
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className="cursor-grab touch-none rounded p-1 text-muted-foreground/60 transition hover:bg-muted hover:text-foreground active:cursor-grabbing"
      aria-label={label}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </button>
  );
}

function OptionMarker({ type }: { type: FormField["type"] }) {
  if (type === "CHECKBOX") {
    return <Square className="size-4 shrink-0 text-muted-foreground" />;
  }

  if (type === "SELECT") {
    return null;
  }

  return <Circle className="size-4 shrink-0 text-muted-foreground" />;
}

function OptionRow({
  option,
  index,
  type,
  onChange,
  onDelete,
  canDelete,
}: {
  option: FormOption;
  index: number;
  type: FormField["type"];
  onChange: (label: string) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({
    id: option.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="group/option flex items-center gap-2"
    >
      <DragHandle
        label="Reorder option"
        attributes={attributes}
        listeners={listeners}
        setActivatorNodeRef={setActivatorNodeRef}
      />
      {type === "SELECT" ? <span className="w-5 text-right text-sm text-muted-foreground">{index + 1}.</span> : <OptionMarker type={type} />}
      <Input
        value={option.label}
        aria-label={`Option ${index + 1}`}
        onChange={(event) => onChange(event.target.value)}
        className="border-0 border-b border-transparent bg-transparent shadow-none rounded-none px-1 hover:border-input focus-visible:border-brand focus-visible:ring-0"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        disabled={!canDelete}
        aria-label={`Delete option ${index + 1}`}
        className="opacity-60 group-hover/option:opacity-100"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

function OptionEditor({
  type,
  options,
  onChange,
}: {
  type: FormField["type"];
  options: FormOption[];
  onChange: (options: FormOption[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    if (!overId || overId === event.active.id) {
      return;
    }

    const from = options.findIndex((option) => option.id === event.active.id);
    const to = options.findIndex((option) => option.id === overId);
    if (from < 0 || to < 0) {
      return;
    }

    onChange(arrayMove(options, from, to));
  };

  return (
    <div className="space-y-1">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={options.map((option) => option.id)} strategy={verticalListSortingStrategy}>
          {options.map((option, index) => (
            <OptionRow
              key={option.id}
              option={option}
              index={index}
              type={type}
              canDelete={options.length > 1}
              onChange={(label) => onChange(options.map((item) => (item.id === option.id ? { ...item, label } : item)))}
              onDelete={() => onChange(options.filter((item) => item.id !== option.id))}
            />
          ))}
        </SortableContext>
      </DndContext>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-7 text-muted-foreground"
        onClick={() => onChange([...options, createOption(`Option ${options.length + 1}`)])}
      >
        <Plus className="size-4" />
        Add option
      </Button>
    </div>
  );
}

function NumberRule({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="space-y-1 text-sm text-foreground">
      <span className="text-muted-foreground">{label}</span>
      <Input
        type="number"
        value={value ?? ""}
        className="bg-card"
        onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
      />
    </label>
  );
}

function patchValidation(field: FormField, patch: Partial<FieldValidation>): FieldValidation {
  return { ...(field.validation ?? {}), ...patch };
}

function RequiredSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
      Required
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label="Required"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          checked ? "bg-brand" : "bg-input"
        )}
      >
        <span
          className={cn(
            "inline-block size-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-4.5" : "translate-x-0.5"
          )}
        />
      </button>
    </label>
  );
}

function fieldTitle(field: FormField) {
  if (field.type === "INSTRUCTION") {
    return docToPlain(field.descriptionDoc) || field.label;
  }

  return docToPlain(field.titleDoc) || field.label;
}

function CollapsedField({ field }: { field: FormField }) {
  const Icon = FIELD_TYPE_ICONS[field.type];
  const title = fieldTitle(field);
  const content = isContentType(field.type);

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "min-w-0 flex-1 truncate",
            field.type === "HEADING" ? "text-lg font-semibold" : content ? "text-sm text-muted-foreground" : "font-medium",
            !title && "text-muted-foreground italic"
          )}
        >
          {title || (content ? "Empty text block" : "Untitled question")}
          {field.required ? <span className="ml-1 text-brand">*</span> : null}
        </p>
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <Icon className="size-3.5" />
          {FIELD_TYPE_LABELS[field.type]}
        </span>
      </div>
      {isChoiceType(field.type) && field.options.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {field.options.slice(0, 3).map((option, index) => (
            <li key={option.id} className="flex items-center gap-2 text-sm text-muted-foreground">
              {field.type === "SELECT" ? <span className="w-4 text-right">{index + 1}.</span> : <OptionMarker type={field.type} />}
              <span className="truncate">{option.label || `Option ${index + 1}`}</span>
            </li>
          ))}
          {field.options.length > 3 ? (
            <li className="pl-6 text-xs text-muted-foreground">+{field.options.length - 3} more</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

export function FieldEditor({
  field,
  bindings,
  selected,
  onSelect,
  onChange,
  onDelete,
  onDuplicate,
}: {
  field: FormField;
  bindings: SortableBindings;
  selected: boolean;
  onSelect: () => void;
  onChange: (field: FormField) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [showDescription, setShowDescription] = useState(() => Boolean(docToPlain(field.descriptionDoc)));
  const content = isContentType(field.type);
  const Icon = FIELD_TYPE_ICONS[field.type];
  const drag = <DragHandle label="Reorder question" {...bindings} />;

  if (!selected) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`Edit ${fieldTitle(field) || FIELD_TYPE_LABELS[field.type]}`}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            onSelect();
          }
        }}
        className="flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-card p-4 shadow-xs transition hover:border-brand/30 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <div onClick={(event) => event.stopPropagation()}>{drag}</div>
        <CollapsedField field={field} />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-md">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-brand" aria-hidden />
      <div className="space-y-4 p-4 pl-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-1 items-start gap-1">
            <div className="pt-1.5">{drag}</div>
            <div className="min-w-0 flex-1">
              {field.type === "INSTRUCTION" ? (
                <RichTextEditor
                  label="Instructions"
                  placeholder="Instructions for respondents"
                  value={field.descriptionDoc}
                  fallbackText={field.label}
                  onChange={(descriptionDoc, plain) =>
                    onChange({
                      ...field,
                      descriptionDoc,
                      label: plain.slice(0, 120) || field.label,
                    })
                  }
                />
              ) : (
                <RichTextEditor
                  label={field.type === "HEADING" ? "Heading" : "Question title"}
                  placeholder={field.type === "HEADING" ? "Heading" : "Question"}
                  variant={field.type === "HEADING" ? "heading" : "default"}
                  value={field.titleDoc}
                  fallbackText={field.label}
                  onChange={(titleDoc, plain) => onChange({ ...field, titleDoc, label: plain })}
                />
              )}
            </div>
          </div>
          <FieldTypeMenu
            current={field.type}
            onSelect={(type) => onChange(changeFieldType(field, type))}
            align="end"
            trigger={<Button type="button" variant="outline" className="w-full justify-between sm:w-48" aria-label="Question type" />}
          >
            <span className="flex items-center gap-2">
              <Icon className="size-4 text-muted-foreground" />
              {FIELD_TYPE_LABELS[field.type]}
            </span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </FieldTypeMenu>
        </div>

        {!content && field.type !== "INSTRUCTION" ? (
          showDescription ? (
            <div className="pl-7">
              <RichTextEditor
                compact
                label="Question description"
                placeholder="Description (optional)"
                value={field.descriptionDoc}
                onChange={(descriptionDoc) => onChange({ ...field, descriptionDoc })}
              />
            </div>
          ) : (
            <Button type="button" variant="ghost" size="sm" className="ml-6 text-muted-foreground" onClick={() => setShowDescription(true)}>
              <Plus className="size-4" />
              Add description
            </Button>
          )
        ) : null}

        {isChoiceType(field.type) ? (
          <OptionEditor type={field.type} options={field.options} onChange={(options) => onChange({ ...field, options })} />
        ) : null}

        {!content ? <Rules field={field} onChange={onChange} /> : null}
      </div>

      <div className="flex items-center justify-end gap-1 border-t border-border px-4 py-2">
        <Button type="button" variant="ghost" size="icon-sm" onClick={onDuplicate} aria-label="Duplicate question">
          <Copy className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onDelete} aria-label="Delete question" className="hover:text-destructive">
          <Trash2 className="size-4" />
        </Button>
        {!content ? (
          <>
            <span className="mx-2 h-6 w-px bg-border" aria-hidden />
            <RequiredSwitch checked={field.required} onChange={(required) => onChange({ ...field, required })} />
          </>
        ) : null}
      </div>
    </div>
  );
}

function RulesBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Validation</p>
      {children}
    </div>
  );
}

function Rules({ field, onChange }: { field: FormField; onChange: (field: FormField) => void }) {
  if (field.type === "TEXT" || field.type === "TEXTAREA") {
    return (
      <RulesBox>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberRule
            label="Minimum length"
            value={field.validation?.minLength}
            onChange={(minLength) => onChange({ ...field, validation: patchValidation(field, { minLength }) })}
          />
          <NumberRule
            label="Maximum length"
            value={field.validation?.maxLength}
            onChange={(maxLength) => onChange({ ...field, validation: patchValidation(field, { maxLength }) })}
          />
        </div>
      </RulesBox>
    );
  }

  if (field.type === "NUMBER") {
    return (
      <RulesBox>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberRule
            label="Minimum"
            value={field.validation?.min}
            onChange={(min) => onChange({ ...field, validation: patchValidation(field, { min }) })}
          />
          <NumberRule
            label="Maximum"
            value={field.validation?.max}
            onChange={(max) => onChange({ ...field, validation: patchValidation(field, { max }) })}
          />
        </div>
      </RulesBox>
    );
  }

  if (field.type === "RATING") {
    return (
      <RulesBox>
        <div className="sm:w-1/2">
          <NumberRule
            label="Maximum rating"
            value={field.validation?.max ?? 5}
            onChange={(max) => onChange({ ...field, validation: patchValidation(field, { max }) })}
          />
        </div>
      </RulesBox>
    );
  }

  if (field.type === "LINEAR_SCALE") {
    return (
      <RulesBox>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberRule
            label="Scale start"
            value={field.validation?.min ?? 1}
            onChange={(min) => onChange({ ...field, validation: patchValidation(field, { min }) })}
          />
          <NumberRule
            label="Scale end"
            value={field.validation?.max ?? 5}
            onChange={(max) => onChange({ ...field, validation: patchValidation(field, { max }) })}
          />
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Start label</span>
            <Input
              value={field.validation?.minLabel ?? ""}
              className="bg-card"
              onChange={(event) => onChange({ ...field, validation: patchValidation(field, { minLabel: event.target.value }) })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">End label</span>
            <Input
              value={field.validation?.maxLabel ?? ""}
              className="bg-card"
              onChange={(event) => onChange({ ...field, validation: patchValidation(field, { maxLabel: event.target.value }) })}
            />
          </label>
        </div>
      </RulesBox>
    );
  }

  if (field.type === "FILE") {
    const selected = new Set(field.validation?.allowedMimeTypes ?? []);
    return (
      <RulesBox>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {FILE_TYPE_PRESETS.map((preset) => {
              const checked = preset.mimes.every((mime) => selected.has(mime));
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={checked}
                  onClick={() => {
                    const next = new Set(selected);
                    for (const mime of preset.mimes) {
                      if (checked) {
                        next.delete(mime);
                      } else {
                        next.add(mime);
                      }
                    }

                    onChange({ ...field, validation: patchValidation(field, { allowedMimeTypes: [...next] }) });
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition",
                    checked ? "border-brand bg-brand-soft text-brand-dark" : "border-input bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <div className="sm:w-1/2">
            <NumberRule
              label="Maximum size (MB)"
              value={field.validation?.maxFileSizeMb ?? 10}
              onChange={(maxFileSizeMb) => onChange({ ...field, validation: patchValidation(field, { maxFileSizeMb }) })}
            />
          </div>
        </div>
      </RulesBox>
    );
  }

  if (field.type === "EMAIL") {
    return <p className="pl-7 text-xs text-muted-foreground">Answers must be a valid email address.</p>;
  }

  if (field.type === "PHONE") {
    return <p className="pl-7 text-xs text-muted-foreground">Answers must be 9–15 digits, with an optional leading +.</p>;
  }

  return null;
}

export function SortableFieldCard(props: Omit<React.ComponentProps<typeof FieldEditor>, "bindings">) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: `field:${props.field.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "relative z-20 opacity-80")}
    >
      <FieldEditor {...props} bindings={{ attributes, listeners, setActivatorNodeRef }} />
    </div>
  );
}
