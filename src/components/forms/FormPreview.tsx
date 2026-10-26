"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

interface Validations {
  minLength?: number | "";
  maxLength?: number | "";
  min?: number | "";
  max?: number | "";
}

interface Question {
  id: string;
  title: string;
  type: string;
  required: boolean;
  validations?: Validations;
  options?: any[];
}

interface FormPreviewProps {
  title: string;
  description: string;
  questions: Question[];
}

export default function FormPreview({ title, description, questions }: FormPreviewProps) {
  const params = useParams();
  const formId = params?.id as string;

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Normalizes database types back to frontend types so the UI knows how to render them
  const getNormalizedType = (type: string) => {
    if (!type) return "SHORT_TEXT";
    const upper = type.toUpperCase();
    if (upper === "SHORT_ANSWER") return "SHORT_TEXT";
    if (upper === "PARAGRAPH") return "LONG_TEXT";
    if (upper === "CHECKBOX") return "MULTIPLE_CHOICE";
    return upper;
  };

  const getOptText = (opt: any) => {
    if (!opt) return "";
    if (typeof opt === "string") return opt;
    return opt.text || opt.label || JSON.stringify(opt);
  };

  const getOptId = (opt: any, index: number) => {
    if (opt && typeof opt === "object" && opt.id) return opt.id;
    return `opt-${index}`;
  };

  const handleChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleCheckboxChange = (questionId: string, value: string, checked: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId] || [];
      if (checked) {
        return { ...prev, [questionId]: [...current, value] };
      } else {
        return { ...prev, [questionId]: current.filter((v: string) => v !== value) };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formId) {
      alert("Please save the form first to generate a real ID before testing submissions.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      answers: Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value: Array.isArray(value) ? value.join(", ") : String(value),
      })),
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/forms/${formId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("Response submitted successfully!");
        setAnswers({});
      } else {
        const err = await res.json();
        alert(`Failed to submit: ${err.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to connect to the backend server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow-md">
      <div className="mb-8 border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">{title || "Untitled Form"}</h1>
        {description && <p className="mt-2 text-gray-600">{description}</p>}
      </div>

      <form className="space-y-8" onSubmit={handleSubmit}>
        {questions.map((rawQ) => {
          // Translate DB types back to UI types right before rendering!
          const q = { ...rawQ, type: getNormalizedType(rawQ.type) };

          return (
            <div key={q.id} className="flex flex-col gap-2">
              
              {q.type === "SECTION_HEADER" ? (
                <div className="my-2 rounded-r-md border-l-4 border-blue-600 bg-blue-50/60 p-4">
                  <h2 className="text-xl font-bold text-blue-900">{q.title || "Untitled Section"}</h2>
                </div>
              ) : (
                <label className="text-base font-medium text-gray-900">
                  {q.title} {q.required && <span className="text-red-500">*</span>}
                </label>
              )}

              {(q.type === "SHORT_TEXT" || q.type === "EMAIL" || q.type === "PHONE") && (
                <input
                  type={q.type === "EMAIL" ? "email" : q.type === "PHONE" ? "tel" : "text"}
                  required={q.required}
                  value={answers[q.id] || ""}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Your answer"
                />
              )}

              {q.type === "LONG_TEXT" && (
                <textarea
                  required={q.required}
                  rows={3}
                  value={answers[q.id] || ""}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Your answer"
                />
              )}

              {q.type === "NUMBER" && (
                <input
                  type="number"
                  required={q.required}
                  min={q.validations?.min || undefined}
                  max={q.validations?.max || undefined}
                  value={answers[q.id] || ""}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0"
                />
              )}

              {q.type === "SINGLE_CHOICE" && (
                <div className="flex flex-col gap-2">
                  {q.options?.map((opt, i) => {
                    const optText = getOptText(opt);
                    return (
                      <label key={getOptId(opt, i)} className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name={q.id} 
                          required={q.required} 
                          checked={answers[q.id] === optText}
                          onChange={() => handleChange(q.id, optText)}
                          className="h-4 w-4 text-blue-600" 
                        />
                        <span className="text-gray-700">{optText}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {q.type === "MULTIPLE_CHOICE" && (
                <div className="flex flex-col gap-2">
                  {q.options?.map((opt, i) => {
                    const optText = getOptText(opt);
                    const isChecked = (answers[q.id] || []).includes(optText);
                    return (
                      <label key={getOptId(opt, i)} className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={(e) => handleCheckboxChange(q.id, optText, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600" 
                        />
                        <span className="text-gray-700">{optText}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {q.type === "DROPDOWN" && (
                <select 
                  required={q.required} 
                  value={answers[q.id] || ""}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Choose an option</option>
                  {q.options?.map((opt, i) => (
                    <option key={getOptId(opt, i)} value={getOptText(opt)}>{getOptText(opt)}</option>
                  ))}
                </select>
              )}

              {q.type === "YES_NO" && (
                <div className="flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2 rounded border border-gray-200 px-4 py-2 hover:bg-gray-50">
                    <input 
                      type="radio" 
                      name={q.id} 
                      value="yes" 
                      required={q.required} 
                      checked={answers[q.id] === "yes"}
                      onChange={() => handleChange(q.id, "yes")}
                      className="h-4 w-4 text-blue-600" 
                    />
                    <span>Yes</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded border border-gray-200 px-4 py-2 hover:bg-gray-50">
                    <input 
                      type="radio" 
                      name={q.id} 
                      value="no" 
                      required={q.required} 
                      checked={answers[q.id] === "no"}
                      onChange={() => handleChange(q.id, "no")}
                      className="h-4 w-4 text-blue-600" 
                    />
                    <span>No</span>
                  </label>
                </div>
              )}

              {q.type === "DATE" && (
                <input
                  type="date"
                  required={q.required}
                  value={answers[q.id] || ""}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                  className="w-full max-w-xs rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}

              {q.type === "RATING" && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <label key={star} className={`cursor-pointer text-2xl ${answers[q.id] >= star ? "text-yellow-400" : "text-gray-300"} hover:text-yellow-400`}>
                      <input 
                        type="radio" 
                        name={q.id} 
                        value={star} 
                        required={q.required} 
                        checked={answers[q.id] === String(star)}
                        onChange={() => handleChange(q.id, String(star))}
                        className="sr-only" 
                      />
                      ★
                    </label>
                  ))}
                </div>
              )}

              {q.type === "LINEAR_SCALE" && (
                <div className="flex items-center gap-4 py-2">
                  <span className="text-sm text-gray-500">1</span>
                  <div className="flex gap-4">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <label key={num} className="flex cursor-pointer flex-col items-center gap-1">
                        <input 
                          type="radio" 
                          name={q.id} 
                          value={num} 
                          required={q.required}
                          checked={answers[q.id] === String(num)}
                          onChange={() => handleChange(q.id, String(num))}
                          className="h-4 w-4 text-blue-600" 
                        />
                        <span className="text-xs text-gray-500">{num}</span>
                      </label>
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">5</span>
                </div>
              )}

              {q.type === "FILE_UPLOAD" && (
                <input
                  type="file"
                  required={q.required}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                  className="w-full max-w-md rounded-md border border-dashed border-gray-300 p-4 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                />
              )}
            </div>
          );
        })}

        <div className="pt-4">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}