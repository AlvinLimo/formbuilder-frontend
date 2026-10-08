import { isChoiceType, isContentType } from "@/lib/field-types";
import { docToPlain } from "@/lib/rich-text";
import type { FormField, FormRecord, FormSection } from "@/lib/types";

export function normalizeForm(form: FormRecord): FormRecord {
  return {
    ...form,
    description: form.description ?? null,
    titleDoc: form.titleDoc ?? null,
    descriptionDoc: form.descriptionDoc ?? null,
    limitOneResponse: form.limitOneResponse ?? true,
    sections: [...(form.sections ?? [])]
      .sort((left, right) => left.order - right.order)
      .map((section, sectionIndex) => ({
        ...section,
        title: section.title ?? "",
        titleDoc: section.titleDoc ?? null,
        descriptionDoc: section.descriptionDoc ?? null,
        order: sectionIndex,
        fields: [...(section.fields ?? [])]
          .sort((left, right) => left.order - right.order)
          .map((field, fieldIndex) => ({
            ...field,
            label: field.label ?? "",
            titleDoc: field.titleDoc ?? null,
            descriptionDoc: field.descriptionDoc ?? null,
            options: field.options ?? [],
            validation: field.validation ?? null,
            required: Boolean(field.required),
            order: fieldIndex,
          })),
      })),
  };
}

export function toPayload(form: FormRecord) {
  return {
    title: form.title.trim(),
    description: form.description?.trim() || null,
    titleDoc: form.titleDoc,
    descriptionDoc: form.descriptionDoc,
    limitOneResponse: form.limitOneResponse,
    sections: form.sections.map((section) => ({
      id: section.id,
      title: section.title.trim(),
      titleDoc: section.titleDoc,
      descriptionDoc: section.descriptionDoc,
      fields: section.fields.map((field) => ({
        id: field.id,
        label: field.label.trim(),
        titleDoc: field.titleDoc,
        descriptionDoc: field.descriptionDoc,
        type: field.type,
        required: isContentType(field.type) ? false : field.required,
        options: isChoiceType(field.type)
          ? field.options
              .filter((option) => option.label.trim())
              .map((option) => ({ id: option.id, label: option.label.trim() }))
          : [],
        validation: field.validation,
      })),
    })),
  };
}

export function validateDraft(form: FormRecord) {
  if (!form.title.trim() && !docToPlain(form.titleDoc)) {
    return "Add a form title.";
  }

  for (const section of form.sections) {
    for (const field of section.fields) {
      const label = (docToPlain(field.titleDoc) || field.label).trim();
      const description = docToPlain(field.descriptionDoc);

      if (field.type === "INSTRUCTION" && !description) {
        return "Instructions need some text.";
      }

      if (field.type === "HEADING" && !label) {
        return "Headings need some text.";
      }

      if (!isContentType(field.type) && !label) {
        return "Every question needs a title.";
      }

      if (isChoiceType(field.type) && field.options.every((option) => !option.label.trim())) {
        return `Add at least one option to "${label || "the choice question"}".`;
      }

      const rules = field.validation;
      if (rules?.minLength != null && rules.maxLength != null && rules.minLength > rules.maxLength) {
        return `Minimum length cannot exceed maximum length on "${label}".`;
      }

      if (rules?.min != null && rules.max != null && field.type === "NUMBER" && rules.min > rules.max) {
        return `Minimum cannot exceed maximum on "${label}".`;
      }

      if (field.type === "RATING") {
        const max = rules?.max ?? 5;
        if (!Number.isInteger(max) || max < 2 || max > 10) {
          return `Rating on "${label}" must be from 2 to 10.`;
        }
      }

      if (field.type === "LINEAR_SCALE") {
        const min = rules?.min ?? 1;
        const max = rules?.max ?? 5;
        if (!Number.isInteger(min) || !Number.isInteger(max) || min >= max || max - min > 10) {
          return `Linear scale on "${label}" must be a whole-number range of at most 10 steps.`;
        }
      }
    }
  }

  return null;
}

function withOrder(sections: FormSection[]): FormSection[] {
  return sections.map((section, sectionIndex) => ({
    ...section,
    order: sectionIndex,
    fields: section.fields.map((field, fieldIndex) => ({ ...field, order: fieldIndex })),
  }));
}

function arrayMove<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function parseDragId(value: string) {
  if (value.startsWith("section-drop:")) {
    return { kind: "drop" as const, id: value.slice("section-drop:".length) };
  }

  if (value.startsWith("section:")) {
    return { kind: "section" as const, id: value.slice("section:".length) };
  }

  if (value.startsWith("field:")) {
    return { kind: "field" as const, id: value.slice("field:".length) };
  }

  return null;
}

function sectionIdForTarget(sections: FormSection[], target: { kind: "drop" | "section" | "field"; id: string }) {
  if (target.kind === "field") {
    return sections.find((section) => section.fields.some((field) => field.id === target.id))?.id ?? null;
  }

  return target.id;
}

export function applyDrag(sections: FormSection[], activeId: string, overId: string) {
  const active = parseDragId(activeId);
  const over = parseDragId(overId);
  if (!active || !over || activeId === overId) {
    return sections;
  }

  if (active.kind === "section") {
    const targetSectionId = sectionIdForTarget(sections, over);
    if (!targetSectionId || targetSectionId === active.id) {
      return sections;
    }

    const from = sections.findIndex((section) => section.id === active.id);
    const to = sections.findIndex((section) => section.id === targetSectionId);
    if (from < 0 || to < 0) {
      return sections;
    }

    return withOrder(arrayMove(sections, from, to));
  }

  if (active.kind !== "field") {
    return sections;
  }

  const source = sections.find((section) => section.fields.some((field) => field.id === active.id));
  if (!source) {
    return sections;
  }

  const sourceIndex = source.fields.findIndex((field) => field.id === active.id);
  const moving = source.fields[sourceIndex];

  if (over.kind === "field") {
    const destination = sections.find((section) => section.fields.some((field) => field.id === over.id));
    if (!destination) {
      return sections;
    }

    const destinationIndex = destination.fields.findIndex((field) => field.id === over.id);
    if (destination.id === source.id) {
      return withOrder(
        sections.map((section) =>
          section.id === source.id
            ? { ...section, fields: arrayMove(section.fields, sourceIndex, destinationIndex) }
            : section
        )
      );
    }

    return withOrder(
      sections.map((section) => {
        if (section.id === source.id) {
          return { ...section, fields: section.fields.filter((field) => field.id !== moving.id) };
        }

        if (section.id === destination.id) {
          const fields = [...section.fields];
          fields.splice(destinationIndex, 0, moving);
          return { ...section, fields };
        }

        return section;
      })
    );
  }

  const destinationId = over.id;
  if (destinationId === source.id) {
    return sections;
  }

  return withOrder(
    sections.map((section) => {
      if (section.id === source.id) {
        return { ...section, fields: section.fields.filter((field) => field.id !== moving.id) };
      }

      if (section.id === destinationId) {
        return { ...section, fields: [...section.fields, moving] };
      }

      return section;
    })
  );
}

export function updateField(sections: FormSection[], fieldId: string, updater: (field: FormField) => FormField) {
  return sections.map((section) => ({
    ...section,
    fields: section.fields.map((field) => (field.id === fieldId ? updater(field) : field)),
  }));
}
