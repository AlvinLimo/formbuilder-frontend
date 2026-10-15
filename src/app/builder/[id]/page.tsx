"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Settings,
} from "lucide-react";

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
  const params = useParams();
  const router = useRouter();
  const formId = params.id;

  const [title, setTitle] = useState("Untitled form");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<Field[]>([]);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    async function loadForm() {
      try {
        const response = await fetch(
          `http://localhost:4000/forms/${formId}`,
          { credentials: "include" }
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
      }
    }

    if (formId) {
      loadForm();
    }
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

    setFields((currentFields) => [...currentFields, newField]);
  }

  function updateField(id: string, changes: Partial<Field>) {
    setFields((currentFields) =>
      currentFields.map((field) =>
        field.id === id ? { ...field, ...changes } : field
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
        if (field.id !== fieldId) return field;

        const updatedOptions = [...field.options];
        updatedOptions[optionIndex] = value;

        return {
          ...field,
          options: updatedOptions,
        };
      })
    );
  }

  function deleteOption(fieldId: string, optionIndex: number) {
    setFields((currentFields) =>
      currentFields.map((field) => {
        if (field.id !== fieldId) return field;

        return {
          ...field,
          options: field.options.filter(
            (_, index) => index !== optionIndex
          ),
        };
      })
    );
  }

  function previewForm() {
    window.open(`/preview/${formId}`, "_blank");
  }

  



async function publishForm() {
  if (!formId || typeof formId !== "string") {
    alert("Form ID is missing.");
    return;
  }

  try {
    // 1. Save the latest form data.
    const saveResponse = await fetch(
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
          questions: fields.map((field, index) => ({
            text: field.label,
            type: field.type,
            required: field.required,
            order: index,
            options: needsOptions(field.type)
              ? field.options
              : [],
          })),
        }),
      }
    );

    const saveText = await saveResponse.text();
    let saveData: any = {};

    try {
      saveData = saveText ? JSON.parse(saveText) : {};
    } catch {
      saveData = { message: saveText };
    }

    if (!saveResponse.ok) {
      if (saveResponse.status === 401) {
        router.replace("/login");
        return;
      }

      throw new Error(
        `Save failed (${saveResponse.status}): ${
          saveData.message || saveData.error || saveText
        }`
      );
    }

    // 2. Publish the form.
    const publishResponse = await fetch(
      `http://localhost:4000/forms/${formId}/publish`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    const publishText = await publishResponse.text();
    let publishData: any = {};

    try {
      publishData = publishText ? JSON.parse(publishText) : {};
    } catch {
      publishData = { message: publishText };
    }

    if (!publishResponse.ok) {
      if (publishResponse.status === 401) {
        router.replace("/login");
        return;
      }

      throw new Error(
        `Publish failed (${publishResponse.status}): ${
          publishData.message ||
          publishData.error ||
          publishText
        }`
      );
    }

    if (!publishData.publicToken) {
      throw new Error(
        "Publishing succeeded, but the server did not return publicToken. Check your backend publish route and Prisma schema."
      );
    }

    // 3. Generate and download the CSV.
    const csvRows = [
      [
        "Form Title",
        "Description",
        "Question",
        "Type",
        "Required",
        "Options",
      ],
      ...fields.map((field) => [
        title,
        description,
        field.label,
        field.type,
        field.required ? "Yes" : "No",
        needsOptions(field.type)
          ? field.options.join("; ")
          : "",
      ]),
    ];

    const csvContent = csvRows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download =
      `${title.trim().replace(/[^a-z0-9_-]+/gi, "_") || "form"}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(downloadUrl);

    // 4. Create the respondent-facing link.
    const publicUrl =
      `${window.location.origin}/fill/${publishData.publicToken}`;

    setShareUrl(publicUrl);

    alert("Form published and CSV downloaded successfully!");
  } catch (error) {
    console.error("Publishing failed:", error);

    alert(
      error instanceof Error
        ? error.message
        : "Could not publish the form. Please try again."
    );
  }
}



async function saveForm() {
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
          questions: fields.map((field, index) => ({
            text: field.label,
            type: field.type,
            required: field.required,
            order: index,
            options: field.options,
          })),
        }),
      }
    );

    const responseText = await response.text();

    let result: any = {};

    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {
      result = { error: responseText };
    }

    if (!response.ok) {
      throw new Error(
        result.error ||
          result.message ||
          `HTTP ${response.status}: Failed to save form`
      );
    }

    setTitle(result.title);
    setDescription(result.description ?? "");

    setFields(
      (result.questions ?? []).map((question: any) => ({
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

    alert("Form saved successfully.");
  } catch (error) {
    console.error("Save form error:", error);

    alert(
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while saving."
    );
  }
}



  const needsOptions = (type: FieldType) =>
    type === "DROPDOWN" ||
    type === "MULTIPLE_CHOICE" ||
    type === "CHECKBOX";

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/forms")}
              className="rounded-lg p-2 hover:bg-zinc-100"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <p className="text-sm font-medium">
                Form Builder
              </p>

              <p className="text-xs text-zinc-500">
                Form ID: {formId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={previewForm}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Preview
            </button>
            <button
              onClick={saveForm}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              Save
            </button>

            <button
              onClick={publishForm}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Publish
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* Form information */}
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-6">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full border-b border-zinc-300 pb-2 text-2xl font-semibold outline-none focus:border-blue-500"
            placeholder="Form title"
          />

          <textarea
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            className="mt-4 w-full resize-none border-b border-zinc-200 pb-2 text-sm text-zinc-600 outline-none focus:border-blue-500"
            placeholder="Form description"
            rows={2}
          />
        </div>
        {shareUrl && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5">
            <h3 className="font-semibold text-green-900">
              Form published successfully!
            </h3>

            <p className="mt-1 text-sm text-green-800">
              Share this link with people who need to fill out your form.
            </p>

            <div className="mt-3 flex gap-2">
              <input
                readOnly
                value={shareUrl}
                className="min-w-0 flex-1 rounded-lg border border-green-200 bg-white px-3 py-2 text-sm"
              />

              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    alert("Share link copied!");
                  } catch {
                    alert("Could not copy the link. Please copy it manually.");
                  }
                }}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
              >
                Copy link
              </button>
            </div>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-5">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-xl border border-zinc-200 bg-white p-6"
            >
              {/* Question header */}
              <div className="mb-4 flex items-start gap-3">
                <GripVertical
                  size={20}
                  className="mt-2 text-zinc-400"
                />

                <div className="flex-1">
                  <input
                    value={field.label}
                    onChange={(event) =>
                      updateField(field.id, {
                        label: event.target.value,
                      })
                    }
                    className="w-full border-b border-zinc-300 pb-2 text-base font-medium outline-none focus:border-blue-500"
                    placeholder="Question"
                  />
                </div>

                <button
                  onClick={() => deleteField(field.id)}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* Question type */}
              <div className="mb-5">
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Question type
                </label>

                <select
                  value={field.type}
                  onChange={(event) =>
                    updateField(field.id, {
                      type: event.target.value as FieldType,
                    })
                  }
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
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
              </div>

              {/* Preview */}
              <div className="rounded-lg bg-zinc-50 p-4">
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
                    className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm"
                    rows={3}
                  />
                )}

                {field.type === "DROPDOWN" && (
                  <select
                    disabled
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  >
                    {field.options.map((option, optionIndex) => (
                      <option key={optionIndex}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}

                {field.type === "MULTIPLE_CHOICE" && (
                  <div className="space-y-3">
                    {field.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className="flex items-center gap-3"
                      >
                        <input
                          disabled
                          type="radio"
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
                          className="border-b border-zinc-300 bg-transparent text-sm outline-none focus:border-blue-500"
                        />

                        <button
                          onClick={() =>
                            deleteOption(
                              field.id,
                              optionIndex
                            )
                          }
                          className="text-zinc-400 hover:text-red-500"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {field.type === "CHECKBOX" && (
                  <div className="space-y-3">
                    {field.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className="flex items-center gap-3"
                      >
                        <input
                          disabled
                          type="checkbox"
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
                          className="border-b border-zinc-300 bg-transparent text-sm outline-none focus:border-blue-500"
                        />

                        <button
                          onClick={() =>
                            deleteOption(
                              field.id,
                              optionIndex
                            )
                          }
                          className="text-zinc-400 hover:text-red-500"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Options */}
              {needsOptions(field.type) && (
                <div className="mt-5">
                  <button
                    onClick={() => addOption(field.id)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    + Add option
                  </button>
                </div>
              )}

              {/* Settings */}
              <div className="mt-5 flex items-center justify-between border-t border-zinc-200 pt-4">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Settings size={16} />
                  Question {index + 1}
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(event) =>
                      updateField(field.id, {
                        required: event.target.checked,
                      })
                    }
                  />

                  Required
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* Add question */}
        <button
          onClick={addField}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-white py-4 text-sm font-medium text-zinc-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
        >
          <Plus size={18} />
          Add question
        </button>
      </main>
    </div>
  );
}