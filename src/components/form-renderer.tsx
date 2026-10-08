"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, Paperclip, Star } from "lucide-react";
import { useRef, useState } from "react";
import { StatusScreen } from "@/components/respondent-layout";
import { RichTextView } from "@/components/rich-text-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, submitPublicForm, uploadPublicFile } from "@/lib/api";
import { isEmptyAnswer, validateAnswers } from "@/lib/answers";
import { acceptForMimeTypes, isContentType } from "@/lib/field-types";
import type { AnswerValue, FileAnswer, FormField, FormRecord, FormSection } from "@/lib/types";
import { cn } from "@/lib/utils";

type FormRendererProps = {
  form: Pick<FormRecord, "title" | "description" | "titleDoc" | "descriptionDoc" | "sections">;
  mode: "preview" | "live";
  publicId?: string | null;
  allowAnotherResponse?: boolean;
};

const INPUT_CLASS = "h-11 bg-card text-base sm:h-10 sm:text-sm";

function answerable(fields: FormField[]) {
  return fields.filter((field) => !isContentType(field.type));
}

function visibleSections(sections: FormSection[]) {
  const withContent = sections.filter((section) => section.fields.length > 0);
  return withContent.length > 0 ? withContent : sections.slice(0, 1);
}

function ruleHint(field: FormField) {
  const rules = field.validation;
  if (!rules) {
    return null;
  }

  if ((field.type === "TEXT" || field.type === "TEXTAREA") && (rules.minLength != null || rules.maxLength != null)) {
    if (rules.minLength != null && rules.maxLength != null) {
      return `${rules.minLength}–${rules.maxLength} characters`;
    }

    return rules.minLength != null ? `At least ${rules.minLength} characters` : `At most ${rules.maxLength} characters`;
  }

  if (field.type === "NUMBER" && (rules.min != null || rules.max != null)) {
    if (rules.min != null && rules.max != null) {
      return `From ${rules.min} to ${rules.max}`;
    }

    return rules.min != null ? `At least ${rules.min}` : `At most ${rules.max}`;
  }

  if (field.type === "EMAIL") {
    return "Enter a valid email address";
  }

  if (field.type === "PHONE") {
    return "9–15 digits, optional leading +";
  }

  if (field.type === "FILE" && rules.maxFileSizeMb) {
    return `Up to ${rules.maxFileSizeMb} MB`;
  }

  return null;
}

export function FormRenderer({ form, mode, publicId, allowAnotherResponse = true }: FormRendererProps) {
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState("");
  const [step, setStep] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  const sections = visibleSections(form.sections);
  const current = Math.min(step, sections.length - 1);
  const section = sections[current];
  const multi = sections.length > 1;
  const last = current === sections.length - 1;

  const setAnswer = (fieldId: string, value: AnswerValue) => {
    setAnswers((existing) => ({ ...existing, [fieldId]: value }));
    setErrors((existing) => {
      if (!existing[fieldId]) {
        return existing;
      }

      const next = { ...existing };
      delete next[fieldId];
      return next;
    });
  };

  const scrollTop = () => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const checkFields = (fields: FormField[]) => {
    const nextErrors = validateAnswers(answerable(fields), answers);
    setErrors(nextErrors);
    const firstId = Object.keys(nextErrors)[0];
    if (firstId) {
      setFormError("Check the highlighted questions.");
      const owner = sections.findIndex((item) => item.fields.some((field) => field.id === firstId));
      if (owner >= 0 && owner !== current) {
        setStep(owner);
      }

      window.setTimeout(() => {
        document.getElementById(`field-${firstId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return false;
    }

    setFormError("");
    return true;
  };

  const goNext = () => {
    if (!section || !checkFields(section.fields)) {
      return;
    }

    setStep(current + 1);
    scrollTop();
  };

  const goBack = () => {
    setFormError("");
    setStep(Math.max(current - 1, 0));
    scrollTop();
  };

  const onFile = async (field: FormField, file: File | null) => {
    if (!file) {
      setAnswers((existing) => {
        const next = { ...existing };
        delete next[field.id];
        return next;
      });
      return;
    }

    if (mode !== "live" || !publicId) {
      return;
    }

    const maxMb = field.validation?.maxFileSizeMb ?? 10;
    if (file.size > maxMb * 1024 * 1024) {
      setErrors((existing) => ({ ...existing, [field.id]: `"${field.label}" must be ${maxMb} MB or smaller.` }));
      return;
    }

    setUploading((existing) => ({ ...existing, [field.id]: true }));
    try {
      const stored = await uploadPublicFile(publicId, field.id, file);
      setAnswer(field.id, stored);
    } catch (error) {
      setErrors((existing) => ({
        ...existing,
        [field.id]: error instanceof Error ? error.message : "Could not upload the file.",
      }));
    } finally {
      setUploading((existing) => ({ ...existing, [field.id]: false }));
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!last) {
      goNext();
      return;
    }

    const fields = answerable(form.sections.flatMap((item) => item.fields));
    if (!checkFields(fields) || mode !== "live" || !publicId) {
      return;
    }

    const data: Record<string, AnswerValue> = {};
    for (const field of fields) {
      const value = answers[field.id];
      if (!isEmptyAnswer(field.type, value) && value !== undefined) {
        data[field.id] = value;
      }
    }

    try {
      setSubmitting(true);
      setFormError("");
      await submitPublicForm(publicId, data);
      void queryClient.invalidateQueries({ queryKey: ["inbox"] });
      setDone(true);
      scrollTop();
    } catch (error) {
      if (error instanceof ApiError && error.fieldId) {
        setErrors({ [error.fieldId]: error.message });
        const owner = sections.findIndex((item) => item.fields.some((field) => field.id === error.fieldId));
        if (owner >= 0) {
          setStep(owner);
        }
      }

      setFormError(error instanceof Error ? error.message : "Could not submit the form.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div ref={topRef} className="scroll-mt-24">
        <StatusScreen
          icon={CheckCircle2}
          tone="success"
          title="Response recorded"
          description="Thank you. Your answers have been saved."
          action={
            allowAnotherResponse ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAnswers({});
                  setErrors({});
                  setStep(0);
                  setDone(false);
                }}
              >
                Submit another response
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  const uploadBusy = Object.values(uploading).some(Boolean);
  const progress = Math.round(((current + 1) / sections.length) * 100);

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4">
      <div ref={topRef} className="scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="h-2 bg-brand" aria-hidden />
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            <RichTextView doc={form.titleDoc} fallback={form.title || "Untitled form"} />
          </h1>
          {form.description || form.descriptionDoc ? (
            <div className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <RichTextView doc={form.descriptionDoc} fallback={form.description} />
            </div>
          ) : null}
          {answerable(form.sections.flatMap((item) => item.fields)).some((field) => field.required) ? (
            <p className="mt-4 text-xs text-brand">* Required</p>
          ) : null}
        </div>
      </div>

      {multi ? (
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
          <div className="mb-2 flex justify-between text-xs font-medium text-muted-foreground">
            <span>
              Page {current + 1} of {sections.length}
            </span>
            <span>{progress}%</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={sections.length}
            aria-valuenow={current + 1}
            aria-label="Form progress"
          >
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}

      {section && (section.title || section.titleDoc || section.descriptionDoc) && (multi || section.descriptionDoc) ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="bg-brand px-5 py-2 text-sm font-semibold text-white">
            <RichTextView doc={section.titleDoc} fallback={section.title || `Section ${current + 1}`} />
          </div>
          {section.descriptionDoc ? (
            <div className="px-5 py-3 text-sm text-muted-foreground">
              <RichTextView doc={section.descriptionDoc} />
            </div>
          ) : null}
        </div>
      ) : null}

      {section?.fields.map((field) => (
        <FieldControl
          key={field.id}
          field={field}
          mode={mode}
          value={answers[field.id]}
          error={errors[field.id]}
          uploading={Boolean(uploading[field.id])}
          onChange={(value) => setAnswer(field.id, value)}
          onFile={(file) => void onFile(field, file)}
        />
      ))}

      {formError ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3 pt-2">
        <div>
          {multi && current > 0 ? (
            <Button type="button" variant="outline" size="lg" className="px-4" onClick={goBack}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
          ) : null}
        </div>
        {last ? (
          <Button type="submit" size="lg" className="px-6" disabled={mode === "preview" || submitting || uploadBusy}>
            {mode === "preview" ? "Submit (preview only)" : submitting ? "Submitting..." : "Submit"}
          </Button>
        ) : (
          <Button type="submit" size="lg" className="px-5">
            Next
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </form>
  );
}

function FieldControl({
  field,
  mode,
  value,
  error,
  uploading,
  onChange,
  onFile,
}: {
  field: FormField;
  mode: "preview" | "live";
  value: AnswerValue | undefined;
  error?: string;
  uploading: boolean;
  onChange: (value: AnswerValue) => void;
  onFile: (file: File | null) => void;
}) {
  if (field.type === "HEADING") {
    return (
      <h2 className="px-1 pt-2 text-xl font-semibold tracking-tight">
        <RichTextView doc={field.titleDoc} fallback={field.label} />
      </h2>
    );
  }

  if (field.type === "INSTRUCTION") {
    return (
      <div className="rounded-xl border-l-4 border-brand bg-brand-soft/60 px-5 py-4 text-sm leading-relaxed text-foreground">
        <RichTextView doc={field.descriptionDoc} fallback={field.label} />
      </div>
    );
  }

  const hint = ruleHint(field);
  const labelId = `${field.id}-label`;

  return (
    <div
      id={`field-${field.id}`}
      className={cn(
        "scroll-mt-24 rounded-xl border bg-card p-5 shadow-xs transition sm:p-6",
        error ? "border-destructive/60 ring-1 ring-destructive/20" : "border-border"
      )}
    >
      <div id={labelId} className="flex items-start gap-1 text-base font-medium">
        <div className="min-w-0">
          <RichTextView doc={field.titleDoc} fallback={field.label || "Untitled question"} />
        </div>
        {field.required ? (
          <span className="text-brand" aria-label="required">
            *
          </span>
        ) : null}
      </div>
      {field.descriptionDoc ? (
        <div className="mt-1 text-sm text-muted-foreground">
          <RichTextView doc={field.descriptionDoc} />
        </div>
      ) : null}
      <div role="group" aria-labelledby={labelId} className="mt-4">
        {renderControl(field, mode, value, onChange, onFile, uploading, Boolean(error))}
      </div>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const CHOICE_ROW =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm transition hover:bg-muted has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40 sm:text-base";

const SCALE_BUTTON =
  "flex size-11 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-sm font-medium transition hover:border-brand/50 has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-white has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40";

function renderControl(
  field: FormField,
  mode: "preview" | "live",
  value: AnswerValue | undefined,
  onChange: (value: AnswerValue) => void,
  onFile: (file: File | null) => void,
  uploading: boolean,
  invalid: boolean
) {
  const textValue = typeof value === "string" ? value : "";

  switch (field.type) {
    case "TEXTAREA":
      return (
        <Textarea
          value={textValue}
          aria-invalid={invalid || undefined}
          placeholder="Your answer"
          onChange={(event) => onChange(event.target.value)}
          className="min-h-28 bg-card text-base sm:text-sm"
        />
      );
    case "NUMBER":
      return (
        <Input
          type="number"
          inputMode="decimal"
          aria-invalid={invalid || undefined}
          placeholder="Your answer"
          value={typeof value === "number" ? value : ""}
          min={field.validation?.min ?? undefined}
          max={field.validation?.max ?? undefined}
          onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
          className={INPUT_CLASS}
        />
      );
    case "EMAIL":
      return (
        <Input
          type="email"
          autoComplete="email"
          aria-invalid={invalid || undefined}
          placeholder="name@example.com"
          value={textValue}
          onChange={(event) => onChange(event.target.value)}
          className={INPUT_CLASS}
        />
      );
    case "PHONE":
      return (
        <Input
          type="tel"
          autoComplete="tel"
          aria-invalid={invalid || undefined}
          placeholder="+254 700 000 000"
          value={textValue}
          onChange={(event) => onChange(event.target.value)}
          className={INPUT_CLASS}
        />
      );
    case "DATE":
      return (
        <Input
          type="date"
          aria-invalid={invalid || undefined}
          value={textValue}
          onChange={(event) => onChange(event.target.value)}
          className={cn(INPUT_CLASS, "sm:w-56")}
        />
      );
    case "SELECT":
      return (
        <select
          aria-invalid={invalid || undefined}
          className="h-11 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-10 sm:w-72 sm:text-sm"
          value={textValue}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Choose</option>
          {field.options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case "RADIO":
      return (
        <div className="space-y-2">
          {field.options.map((option) => (
            <label key={option.id} className={CHOICE_ROW}>
              <input
                type="radio"
                name={field.id}
                className="size-4 accent-brand"
                checked={value === option.id}
                onChange={() => onChange(option.id)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      );
    case "CHECKBOX":
      return (
        <div className="space-y-2">
          {field.options.map((option) => {
            const selected = Array.isArray(value) && value.includes(option.id);
            return (
              <label key={option.id} className={CHOICE_ROW}>
                <input
                  type="checkbox"
                  className="size-4 accent-brand"
                  checked={selected}
                  onChange={() => {
                    const existing = Array.isArray(value) ? value : [];
                    onChange(selected ? existing.filter((id) => id !== option.id) : [...existing, option.id]);
                  }}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      );
    case "YES_NO":
      return (
        <div className="grid grid-cols-2 gap-2 sm:w-72">
          {[
            { label: "Yes", stored: true },
            { label: "No", stored: false },
          ].map((choice) => (
            <label key={choice.label} className={cn(CHOICE_ROW, "justify-center")}>
              <input
                type="radio"
                name={field.id}
                className="size-4 accent-brand"
                checked={value === choice.stored}
                onChange={() => onChange(choice.stored)}
              />
              <span>{choice.label}</span>
            </label>
          ))}
        </div>
      );
    case "RATING": {
      const max = field.validation?.max ?? 5;
      const selected = typeof value === "number" ? value : 0;
      return (
        <div className="flex flex-wrap gap-1" role="radiogroup">
          {Array.from({ length: max }, (_, index) => index + 1).map((score) => (
            <label key={score} className="cursor-pointer rounded-md p-1 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40">
              <input
                type="radio"
                name={field.id}
                className="sr-only"
                checked={value === score}
                onChange={() => onChange(score)}
                aria-label={`${score} of ${max}`}
              />
              <Star
                className={cn(
                  "size-9 transition",
                  score <= selected ? "fill-brand text-brand" : "text-muted-foreground/50 hover:text-brand/60"
                )}
              />
            </label>
          ))}
        </div>
      );
    }
    case "LINEAR_SCALE": {
      const min = field.validation?.min ?? 1;
      const max = field.validation?.max ?? 5;
      const scores: number[] = [];
      for (let score = min; score <= max; score += 1) {
        scores.push(score);
      }

      return (
        <div>
          <div className="flex flex-wrap gap-2">
            {scores.map((score) => (
              <label key={score} className={SCALE_BUTTON}>
                <input
                  type="radio"
                  name={field.id}
                  className="sr-only"
                  checked={value === score}
                  onChange={() => onChange(score)}
                />
                {score}
              </label>
            ))}
          </div>
          {field.validation?.minLabel || field.validation?.maxLabel ? (
            <div className="mt-2 flex justify-between gap-4 text-xs text-muted-foreground">
              <span>{field.validation?.minLabel}</span>
              <span className="text-right">{field.validation?.maxLabel}</span>
            </div>
          ) : null}
        </div>
      );
    }
    case "FILE": {
      const file = value && typeof value === "object" && "fileName" in value ? (value as FileAnswer) : null;
      const disabled = mode === "preview" || uploading;
      return (
        <div className="space-y-2">
          <label
            className={cn(
              "flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-input bg-muted/40 px-4 py-4 text-center text-sm text-muted-foreground transition hover:border-brand/50 hover:bg-brand-soft/40 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <Paperclip className="size-5" />
            <span className="font-medium text-foreground">{file ? file.fileName : "Choose a file"}</span>
            <span className="text-xs">
              {mode === "preview" ? "File upload runs on the published form." : uploading ? "Uploading..." : "Click to browse"}
            </span>
            <input
              type="file"
              className="sr-only"
              accept={acceptForMimeTypes(field.validation?.allowedMimeTypes ?? [])}
              disabled={disabled}
              onChange={(event) => onFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      );
    }
    default:
      return (
        <Input
          type="text"
          aria-invalid={invalid || undefined}
          placeholder="Your answer"
          value={textValue}
          onChange={(event) => onChange(event.target.value)}
          className={INPUT_CLASS}
        />
      );
  }
}
