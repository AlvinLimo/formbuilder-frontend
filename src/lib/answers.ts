import { isAllowedFile, isContentType } from "@/lib/field-types";
import type { AnswerValue, FormField } from "@/lib/types";

export function isEmptyAnswer(type: FormField["type"], value: AnswerValue | undefined | null) {
  if (value === undefined || value === null) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim() === "";
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (type === "FILE") {
    return typeof value !== "object" || typeof value.path !== "string" || !value.path;
  }

  if (typeof value === "number") {
    return Number.isNaN(value);
  }

  return false;
}

export function validateAnswer(field: FormField, value: AnswerValue | undefined | null): string | null {
  if (isContentType(field.type)) {
    return null;
  }

  const empty = isEmptyAnswer(field.type, value);
  if (field.required && empty) {
    return `"${field.label || "This question"}" is required.`;
  }

  if (empty) {
    return null;
  }

  const rules = field.validation ?? {};

  switch (field.type) {
    case "TEXT":
    case "TEXTAREA":
    case "EMAIL":
    case "PHONE": {
      if (typeof value !== "string") {
        return `"${field.label}" must be text.`;
      }

      const text = value.trim();
      if (field.type === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
        return `"${field.label}" must be a valid email address.`;
      }

      if (field.type === "PHONE" && !/^\+?[0-9]{9,15}$/.test(text)) {
        return `"${field.label}" must be 9–15 digits with an optional leading +.`;
      }

      if ((field.type === "TEXT" || field.type === "TEXTAREA") && rules.minLength != null && text.length < rules.minLength) {
        return `"${field.label}" must be at least ${rules.minLength} characters.`;
      }

      if ((field.type === "TEXT" || field.type === "TEXTAREA") && rules.maxLength != null && text.length > rules.maxLength) {
        return `"${field.label}" must be at most ${rules.maxLength} characters.`;
      }

      return null;
    }
    case "NUMBER":
    case "RATING":
    case "LINEAR_SCALE": {
      const number = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(number)) {
        return `"${field.label}" must be a number.`;
      }

      if (field.type === "RATING") {
        const max = rules.max ?? 5;
        if (!Number.isInteger(number) || number < 1 || number > max) {
          return `"${field.label}" must be a whole number from 1 to ${max}.`;
        }
      }

      if (field.type === "LINEAR_SCALE") {
        const min = rules.min ?? 1;
        const max = rules.max ?? 5;
        if (!Number.isInteger(number) || number < min || number > max) {
          return `"${field.label}" must be a whole number from ${min} to ${max}.`;
        }
      }

      if (field.type === "NUMBER" && rules.min != null && number < rules.min) {
        return `"${field.label}" must be at least ${rules.min}.`;
      }

      if (field.type === "NUMBER" && rules.max != null && number > rules.max) {
        return `"${field.label}" must be at most ${rules.max}.`;
      }

      return null;
    }
    case "DATE": {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
        return `"${field.label}" must be a valid date.`;
      }

      return null;
    }
    case "YES_NO": {
      if (typeof value !== "boolean") {
        return `"${field.label}" must be yes or no.`;
      }

      return null;
    }
    case "RADIO":
    case "SELECT": {
      if (typeof value !== "string" || !field.options.some((option) => option.id === value)) {
        return `"${field.label}" has an invalid choice.`;
      }

      return null;
    }
    case "CHECKBOX": {
      if (
        !Array.isArray(value) ||
        value.some((optionId) => typeof optionId !== "string" || !field.options.some((option) => option.id === optionId))
      ) {
        return `"${field.label}" has an invalid choice.`;
      }

      return null;
    }
    case "FILE": {
      if (value == null || typeof value !== "object" || !("path" in value) || !value.path || !value.fileName) {
        return `"${field.label}" needs a file.`;
      }

      if (!isAllowedFile(value.mimeType, value.fileName, rules.allowedMimeTypes ?? [])) {
        return `"${field.label}" file type is not allowed.`;
      }

      const maxMb = rules.maxFileSizeMb ?? 10;
      if (value.size > maxMb * 1024 * 1024) {
        return `"${field.label}" must be ${maxMb} MB or smaller.`;
      }

      return null;
    }
    default:
      return null;
  }
}

export function validateAnswers(fields: FormField[], answers: Record<string, AnswerValue | undefined>) {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const message = validateAnswer(field, answers[field.id]);
    if (message) {
      errors[field.id] = message;
    }
  }

  return errors;
}
