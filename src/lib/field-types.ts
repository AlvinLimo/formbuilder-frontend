import type { FieldType, FieldValidation, FormField, FormOption, FormRecord } from "@/lib/types";

export const QUESTION_TYPES: FieldType[] = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "EMAIL",
  "PHONE",
  "RADIO",
  "CHECKBOX",
  "SELECT",
  "YES_NO",
  "RATING",
  "LINEAR_SCALE",
  "DATE",
  "FILE",
];

export const CONTENT_TYPES: FieldType[] = ["HEADING", "INSTRUCTION"];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: "Short text",
  TEXTAREA: "Long text",
  NUMBER: "Number",
  EMAIL: "Email",
  PHONE: "Phone",
  RADIO: "Single choice",
  CHECKBOX: "Multiple choice",
  SELECT: "Dropdown",
  YES_NO: "Yes / no",
  RATING: "Rating",
  LINEAR_SCALE: "Linear scale",
  DATE: "Date",
  FILE: "File upload",
  HEADING: "Heading",
  INSTRUCTION: "Instructions",
};

export const FILE_TYPE_PRESETS = [
  { id: "pdf", label: "PDF", mimes: ["application/pdf"], extensions: [".pdf"] },
  { id: "png", label: "PNG", mimes: ["image/png"], extensions: [".png"] },
  { id: "jpeg", label: "JPEG", mimes: ["image/jpeg"], extensions: [".jpg", ".jpeg"] },
  {
    id: "word",
    label: "Word",
    mimes: ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    extensions: [".doc", ".docx"],
  },
  { id: "text", label: "Text", mimes: ["text/plain"], extensions: [".txt"] },
];

const DEFAULT_FILE_PRESETS = ["pdf", "png", "jpeg", "word"];

// Value for <input accept>: extensions are included because browsers without Office may not know the Word types.
export function acceptForMimeTypes(allowed: string[]) {
  const extensions = FILE_TYPE_PRESETS.filter((preset) => preset.mimes.some((mime) => allowed.includes(mime))).flatMap(
    (preset) => preset.extensions
  );
  return [...new Set([...allowed, ...extensions])].join(",");
}

export function isAllowedFile(mimeType: string, fileName: string, allowed: string[]) {
  if (allowed.length === 0 || allowed.includes(mimeType)) {
    return true;
  }

  const extension = fileName.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
  return FILE_TYPE_PRESETS.some(
    (preset) => extension && preset.extensions.includes(extension) && preset.mimes.some((mime) => allowed.includes(mime))
  );
}

export function isContentType(type: FieldType) {
  return type === "HEADING" || type === "INSTRUCTION";
}

export function isChoiceType(type: FieldType) {
  return type === "RADIO" || type === "CHECKBOX" || type === "SELECT";
}

export function defaultValidation(type: FieldType): FieldValidation | null {
  switch (type) {
    case "TEXT":
    case "TEXTAREA":
      return { minLength: null, maxLength: null };
    case "NUMBER":
      return { min: null, max: null };
    case "RATING":
      return { max: 5 };
    case "LINEAR_SCALE":
      return { min: 1, max: 5, minLabel: "", maxLabel: "" };
    case "FILE":
      return {
        allowedMimeTypes: FILE_TYPE_PRESETS.filter((preset) => DEFAULT_FILE_PRESETS.includes(preset.id)).flatMap(
          (preset) => preset.mimes
        ),
        maxFileSizeMb: 10,
      };
    default:
      return null;
  }
}

export function createOption(label: string): FormOption {
  return { id: crypto.randomUUID(), label };
}

export function createField(type: FieldType): FormField {
  return {
    id: crypto.randomUUID(),
    label: "",
    titleDoc: null,
    descriptionDoc: null,
    type,
    required: false,
    options: isChoiceType(type) ? [createOption("Option 1"), createOption("Option 2")] : [],
    validation: defaultValidation(type),
    order: 0,
  };
}

export function createSection(title = "Section"): import("@/lib/types").FormSection {
  return {
    id: crypto.randomUUID(),
    title,
    titleDoc: null,
    descriptionDoc: null,
    order: 0,
    fields: [],
  };
}

export function changeFieldType(field: FormField, type: FieldType): FormField {
  return {
    ...field,
    type,
    required: isContentType(type) ? false : field.required,
    options: isChoiceType(type)
      ? field.options.length > 0
        ? field.options
        : [createOption("Option 1"), createOption("Option 2")]
      : [],
    validation: defaultValidation(type),
  };
}

export function questionCount(form: Pick<FormRecord, "sections">) {
  return form.sections.reduce(
    (total, section) => total + section.fields.filter((field) => !isContentType(field.type)).length,
    0
  );
}
