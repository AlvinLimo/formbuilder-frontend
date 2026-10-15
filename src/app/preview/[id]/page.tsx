"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type QuestionType =
  | "SHORT_ANSWER"
  | "PARAGRAPH"
  | "MULTIPLE_CHOICE"
  | "CHECKBOX"
  | "DROPDOWN";

type Question = {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  order: number;
  options: {
    id: string;
    text: string;
  }[];
};

type FormData = {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  questions: Question[];
};

export default function PreviewPage() {
  const params = useParams();
  const formId = params.id as string;

  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!formId) return;

    const loadForm = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `http://localhost:4000/forms/${formId}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load form");
        }

        const data = await response.json();

        setForm(data);
      } catch (error) {
        console.error(error);
        setError("Unable to load this form.");
      } finally {
        setLoading(false);
      }
    };

    loadForm();
  }, [formId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 p-10">
        <div className="mx-auto max-w-3xl rounded-xl bg-white p-8">
          <p className="text-zinc-500">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-zinc-100 p-10">
        <div className="mx-auto max-w-3xl rounded-xl bg-white p-8">
          <h1 className="text-xl font-semibold">
            Form not found
          </h1>

          <p className="mt-2 text-zinc-500">
            {error || "This form could not be found."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        {/* Form header */}
        <div className="rounded-xl border border-zinc-200 bg-white p-8">
          <h1 className="text-3xl font-bold text-zinc-900">
            {form.title}
          </h1>

          {form.description && (
            <p className="mt-3 text-zinc-600">
              {form.description}
            </p>
          )}
        </div>

        {/* Questions */}
        <div className="mt-6 space-y-5">
          {form.questions.map((question) => (
            <div
              key={question.id}
              className="rounded-xl border border-zinc-200 bg-white p-6"
            >
              <label className="mb-3 block font-medium text-zinc-900">
                {question.text}

                {question.required && (
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                )}
              </label>

              {/* Short answer */}
              {question.type === "SHORT_ANSWER" && (
                <input
                  type="text"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
                  placeholder="Your answer"
                />
              )}

              {/* Paragraph */}
              {question.type === "PARAGRAPH" && (
                <textarea
                  rows={5}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
                  placeholder="Your answer"
                />
              )}

              {/* Multiple choice */}
              {question.type === "MULTIPLE_CHOICE" && (
                <div className="space-y-3">
                  {question.options.map((option) => (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-center gap-3"
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option.text}
                        className="h-4 w-4"
                      />

                      <span>{option.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Checkbox */}
              {question.type === "CHECKBOX" && (
                <div className="space-y-3">
                  {question.options.map((option) => (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-center gap-3"
                    >
                      <input
                        type="checkbox"
                        value={option.text}
                        className="h-4 w-4"
                      />

                      <span>{option.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Dropdown */}
              {question.type === "DROPDOWN" && (
                <select className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-zinc-500">
                  <option value="">
                    Choose an option
                  </option>

                  {question.options.map((option) => (
                    <option
                      key={option.id}
                      value={option.text}
                    >
                      {option.text}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}