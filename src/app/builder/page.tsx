"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Settings,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";

type FieldType =
  | "SHORT_ANSWER"
  | "PARAGRAPH"
  | "MULTIPLE_CHOICE"
  | "CHECKBOX"
  | "DROPDOWN";

type Field = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: string[];
  order: number;
};

const fieldTypes: { value: FieldType; label: string }[] = [
  { value: "SHORT_ANSWER", label: "Short answer" },
  { value: "PARAGRAPH", label: "Paragraph" },
  { value: "MULTIPLE_CHOICE", label: "Multiple choice" },
  { value: "CHECKBOX", label: "Checkboxes" },
  { value: "DROPDOWN", label: "Dropdown" },
];

export default function BuilderPage() {
  const router = useRouter();
  const params = useParams();

  const formId = params.id as string;

  const [title, setTitle] = useState("Untitled form");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadForm() {
      if (!formId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:4000/forms/${formId}`
        );

        if (!response.ok) {
          throw new Error("Failed to load form");
        }

        const form = await response.json();

        setTitle(form.title);
        setDescription(form.description ?? "");

        setFields(
          (form.questions ?? []).map((question: any) => ({
            id: question.id,
            label: question.text,
            type: question.type,
            required: question.required,
            options: (question.options ?? []).map(
              (option: any) => option.text
            ),
            order: question.order,
          }))
        );
      } catch (error) {
        console.error("Failed to load form:", error);
      } finally {
        setLoading(false);
      }
    }

    loadForm();
  }, [formId]);

  function addField() {
    const newField: Field = {
      id: crypto.randomUUID(),
      label: "Untitled question",
      type: "SHORT_ANSWER",
      required: false,
      options: ["Option 1", "Option 2"],
      order: fields.length,
    };

    setFields((currentFields) => [
      ...currentFields,
      newField,
    ]);
  }

  function updateField(
    id: string,
    changes: Partial<Field>
  ) {
    setFields((currentFields) =>
      currentFields.map((field) =>
        field.id === id
          ? { ...field, ...changes }
          : field
      )
    );
  }

  function deleteField(id: string) {
    setFields((currentFields) =>
      currentFields.filter((field) => field.id !== id)
    );
  }

  function addOption(id: string) {
    setFields((currentFields) =>
      currentFields.map((field) =>
        field.id === id
          ? {
              ...field,
              options: [
                ...field.options,
                `Option ${field.options.length + 1}`,
              ],
            }
          : field
      )
    );
  }

  function updateOption(
    fieldId: string,
    optionIndex: number,
    value: string
  ) {
    setFields((currentFields) =>
      currentFields.map((field) => {
        if (field.id !== fieldId) {
          return field;
        }

        const updatedOptions = [...field.options];
        updatedOptions[optionIndex] = value;

        return {
          ...field,
          options: updatedOptions,
        };
      })
    );
  }

  function deleteOption(
    fieldId: string,
    optionIndex: number
  ) {
    setFields((currentFields) =>
      currentFields.map((field) => {
        if (field.id !== fieldId) {
          return field;
        }

        return {
          ...field,
          options: field.options.filter(
            (_, index) => index !== optionIndex
          ),
        };
      })
    );
  }

  async function saveQuestions() {
  if (!formId) {
    alert("Form ID is missing.");
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:4000/forms/${formId}`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          questions: fields.map((field) => ({
            text: field.label,
            type: field.type,
            required: field.required,
            options: field.options,
          })),
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to save form");
    }

    const updatedForm = await response.json();

    setTitle(updatedForm.title);
    setDescription(updatedForm.description ?? "");

    setFields(
      (updatedForm.questions ?? []).map(
        (question: any) => ({
          id: question.id,
          label: question.text,
          type: question.type,
          required: question.required,
          options: (question.options ?? []).map(
            (option: any) => option.text
          ),
          order: question.order,
        })
      )
    );

    alert("Form saved successfully.");
  } catch (error) {
    console.error("Failed to save form:", error);
    alert("Failed to save form.");
  }
}
  const needsOptions = (type: FieldType) =>
    type === "DROPDOWN" ||
    type === "MULTIPLE_CHOICE" ||
    type === "CHECKBOX";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100">
        <p className="text-sm text-zinc-500">
          Loading form...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/forms")}
              className="rounded-lg p-2 hover:bg-zinc-100"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <h1 className="font-semibold">
                Form Builder
              </h1>

              <p className="text-xs text-zinc-500">
                Form ID: {formId}
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={() => router.push(`/preview/${formId}`)}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Preview
            </button>

            <button
              type="button"
              onClick={saveQuestions}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              Save
            </button>

            <button
              type="button"
              onClick={() => router.push(`/publish/${formId}`)}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Publish
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-6">
          <input
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            className="w-full border-b border-zinc-200 pb-3 text-2xl font-semibold outline-none focus:border-blue-500"
            placeholder="Form title"
          />

          <textarea
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            className="mt-4 w-full resize-none text-sm text-zinc-500 outline-none"
            rows={2}
            placeholder="Form description"
          />
        </div>

        <div className="space-y-5">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-xl border border-zinc-200 bg-white p-6"
            >
              <div className="mb-5 flex items-center gap-3">
                <GripVertical
                  size={20}
                  className="cursor-grab text-zinc-400"
                />

                <span className="text-sm font-medium text-zinc-500">
                  Question {index + 1}
                </span>

                <div className="ml-auto flex items-center gap-2">
                  <Settings
                    size={17}
                    className="text-zinc-400"
                  />

                  <button
                    onClick={() =>
                      deleteField(field.id)
                    }
                    className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>

              <input
                value={field.label}
                onChange={(event) =>
                  updateField(field.id, {
                    label: event.target.value,
                  })
                }
                className="mb-4 w-full rounded-lg border border-zinc-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Question"
              />

              <select
                value={field.type}
                onChange={(event) =>
                  updateField(field.id, {
                    type: event.target.value as FieldType,
                  })
                }
                className="mb-5 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                {fieldTypes.map((type) => (
                  <option
                    key={type.value}
                    value={type.value}
                  >
                    {type.label}
                  </option>
                ))}
              </select>

              <div className="mb-5 rounded-lg bg-zinc-50 p-4">
                {field.type === "SHORT_ANSWER" && (
                  <input
                    disabled
                    placeholder="Short answer"
                    className="w-full border-b border-zinc-300 bg-transparent py-2 text-sm"
                  />
                )}

                {field.type === "PARAGRAPH" && (
                  <textarea
                    disabled
                    placeholder="Long answer"
                    className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm"
                    rows={3}
                  />
                )}

                {field.type === "DROPDOWN" && (
                  <select
                    disabled
                    className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm"
                  >
                    {field.options.map(
                      (option, optionIndex) => (
                        <option key={optionIndex}>
                          {option}
                        </option>
                      )
                    )}
                  </select>
                )}

                {field.type === "MULTIPLE_CHOICE" && (
                  <div className="space-y-3">
                    {field.options.map(
                      (option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="radio"
                            disabled
                            name={`radio-${field.id}`}
                          />

                          <input
                            value={option}
                            onChange={(event) =>
                              updateOption(
                                field.id,
                                optionIndex,
                                event.target.value
                              )
                            }
                            className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                          />

                          <button
                            onClick={() =>
                              deleteOption(
                                field.id,
                                optionIndex
                              )
                            }
                            className="text-sm text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}

                {field.type === "CHECKBOX" && (
                  <div className="space-y-3">
                    {field.options.map(
                      (option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            disabled
                          />

                          <input
                            value={option}
                            onChange={(event) =>
                              updateOption(
                                field.id,
                                optionIndex,
                                event.target.value
                              )
                            }
                            className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                          />

                          <button
                            onClick={() =>
                              deleteOption(
                                field.id,
                                optionIndex
                              )
                            }
                            className="text-sm text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {needsOptions(field.type) && (
                <button
                  onClick={() =>
                    addOption(field.id)
                  }
                  className="mb-5 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  + Add option
                </button>
              )}

              <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(event) =>
                      updateField(field.id, {
                        required:
                          event.target.checked,
                      })
                    }
                    className="h-4 w-4"
                  />

                  Required
                </label>

                <span className="text-xs text-zinc-400">
                  {field.type}
                </span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addField}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-white py-4 font-medium text-zinc-600 transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
        >
          <Plus size={20} />
          Add question
        </button>
      </main>
    </div>
  );
}