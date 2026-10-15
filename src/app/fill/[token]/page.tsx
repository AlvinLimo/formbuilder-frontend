
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type QuestionType =
  | "SHORT_ANSWER"
  | "PARAGRAPH"
  | "MULTIPLE_CHOICE"
  | "CHECKBOX"
  | "DROPDOWN";

type Option = {
  id: string;
  text: string;
};

type Question = {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  order: number;
  options: Option[];
};

type PublicForm = {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  questions: Question[];
};

export default function FillFormPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [form, setForm] = useState<PublicForm | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadForm() {
      try {
        const response = await fetch(
          `http://localhost:4000/public/forms/token/${encodeURIComponent(token)}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "This form could not be found."
          );
        }

        setForm(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load this form."
        );
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadForm();
    }
  }, [token]);

  function updateAnswer(questionId: string, value: string) {
    setAnswers((current) => ({
      ...current,
      [questionId]: value === "" ? [] : [value],
    }));
  }

  function updateCheckbox(
    questionId: string,
    option: string,
    checked: boolean
  ) {
    setAnswers((current) => {
      const selected = current[questionId] ?? [];

      const next = checked
        ? [...selected, option]
        : selected.filter((value) => value !== option);

      return {
        ...current,
        [questionId]: next,
      };
    });
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form || submitting) return;

    setError("");

    // Validate required questions before sending.
    const missing = form.questions.find((question) => {
      const values = answers[question.id] ?? [];
      return question.required && !values.some((value) => value.trim());
    });

    if (missing) {
      setError(`Please answer the required question: "${missing.text}"`);
      return;
    }

    setSubmitting(true);

    try {
      const payload = form.questions.map((question) => ({
        questionId: question.id,
        value: (answers[question.id] ?? []).join(", "),
      }));

      const response = await fetch(
        `http://localhost:4000/forms/${form.id}/responses`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answers: payload,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Your response could not be submitted."
        );
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
        <p className="text-zinc-600">Loading form...</p>
      </main>
    );
  }

  if (error && !form) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
        <div className="w-full max-w-lg rounded-xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-zinc-900">
            Form unavailable
          </h1>
          <p className="mt-3 text-zinc-600">{error}</p>
        </div>
      </main>
    );
  }

  if (!form) return null;

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
        <div className="w-full max-w-lg rounded-xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">
            ✓
          </div>
          <h1 className="mt-4 text-2xl font-bold text-zinc-900">
            Response submitted
          </h1>
          <p className="mt-3 text-zinc-600">
            Thank you. Your response has been recorded successfully.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="h-2 bg-blue-600" />
          <div className="p-6 sm:p-8">
            <h1 className="text-3xl font-bold text-zinc-900">
              {form.title}
            </h1>

            {form.description && (
              <p className="mt-3 whitespace-pre-wrap text-zinc-600">
                {form.description}
              </p>
            )}

            <p className="mt-5 border-t border-zinc-200 pt-4 text-sm text-zinc-500">
              * Indicates a required question
            </p>
          </div>
        </header>

        <form onSubmit={submitForm} className="space-y-5">
          {[...form.questions]
            .sort((a, b) => a.order - b.order)
            .map((question, index) => (
              <section
                key={question.id}
                className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <label
                  htmlFor={`question-${question.id}`}
                  className="mb-4 block font-medium text-zinc-900"
                >
                  {index + 1}. {question.text}
                  {question.required && (
                    <span className="ml-1 text-red-600">*</span>
                  )}
                </label>

                {question.type === "SHORT_ANSWER" && (
                  <input
                    id={`question-${question.id}`}
                    type="text"
                    required={question.required}
                    value={answers[question.id]?.[0] ?? ""}
                    onChange={(event) =>
                      updateAnswer(question.id, event.target.value)
                    }
                    placeholder="Your answer"
                    className="w-full border-b border-zinc-300 bg-transparent py-3 outline-none focus:border-blue-600"
                  />
                )}

                {question.type === "PARAGRAPH" && (
                  <textarea
                    id={`question-${question.id}`}
                    required={question.required}
                    value={answers[question.id]?.[0] ?? ""}
                    onChange={(event) =>
                      updateAnswer(question.id, event.target.value)
                    }
                    rows={4}
                    placeholder="Your answer"
                    className="w-full rounded-lg border border-zinc-300 p-3 outline-none focus:border-blue-600"
                  />
                )}

                {question.type === "MULTIPLE_CHOICE" && (
                  <div className="space-y-3">
                    {question.options.map((option) => (
                      <label
                        key={option.id}
                        className="flex cursor-pointer items-center gap-3 text-zinc-700"
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option.text}
                          required={question.required}
                          checked={
                            (answers[question.id] ?? [])[0] === option.text
                          }
                          onChange={() =>
                            updateAnswer(question.id, option.text)
                          }
                          className="h-4 w-4 accent-blue-600"
                        />
                        <span>{option.text}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === "CHECKBOX" && (
                  <div className="space-y-3">
                    {question.options.map((option) => (
                      <label
                        key={option.id}
                        className="flex cursor-pointer items-center gap-3 text-zinc-700"
                      >
                        <input
                          type="checkbox"
                          checked={(answers[question.id] ?? []).includes(
                            option.text
                          )}
                          onChange={(event) =>
                            updateCheckbox(
                              question.id,
                              option.text,
                              event.target.checked
                            )
                          }
                          className="h-4 w-4 accent-blue-600"
                        />
                        <span>{option.text}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === "DROPDOWN" && (
                  <select
                    id={`question-${question.id}`}
                    required={question.required}
                    value={answers[question.id]?.[0] ?? ""}
                    onChange={(event) =>
                      updateAnswer(question.id, event.target.value)
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white p-3 outline-none focus:border-blue-600"
                  >
                    <option value="">Select an option</option>
                    {question.options.map((option) => (
                      <option key={option.id} value={option.text}>
                        {option.text}
                      </option>
                    ))}
                  </select>
                )}
              </section>
            ))}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit response"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Please review your answers before submitting.
        </p>
      </div>
    </main>
  );
}
