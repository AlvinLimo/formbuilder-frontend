"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function PublicFormSubmitPage() {
  const params = useParams();
  const formId = params?.id as string;

  const [form, setForm] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/forms/${formId}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          // Map backend 'text' back to 'title' so frontend labels render properly
          if (data.questions) {
            data.questions = data.questions.map((q: any) => ({
              ...q,
              title: q.text
            }));
          }
          setForm(data);
        } else {
          loadFromLocal();
        }
      })
      .catch(() => loadFromLocal());
  }, [formId]);

  const loadFromLocal = () => {
    const savedForms = localStorage.getItem("my_forms");
    if (savedForms) {
      const forms = JSON.parse(savedForms);
      const currentForm = forms.find((f: any) => f.id === formId);
      if (currentForm) setForm(currentForm);
    }
  };

  const handleInputChange = (questionId: string, value: any) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Transform answers dictionary into the array format expected by backend
    const formattedAnswers = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value: Array.isArray(value) ? value.join(", ") : value
    }));

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/forms/${formId}/responses`, {
        method: "POST", // Matches backend app.post("/forms/:id/responses")
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: formattedAnswers })
      });
      
      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
        return;
      } else {
        // Show exact backend error (e.g. "This form is not published")
        setErrorMsg(data.error || "Failed to submit response.");
        return;
      }
    } catch (err) {
      console.error("Backend connection error during submission", err);
      setErrorMsg("Could not connect to the backend server.");
    }
  };

  if (!form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Form Not Found</h1>
          <p className="text-gray-500 mt-2">This form may have been deleted or the link is invalid.</p>
        </div>
      </div>
    );
  }

  if (form.isPublished === false && form.status === "CLOSED") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-md bg-white p-8 rounded-lg shadow-sm border">
          <h1 className="text-2xl font-bold text-red-600">Form Closed</h1>
          <p className="text-gray-600 mt-2">This form is no longer accepting responses.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-md bg-white p-8 rounded-lg shadow-sm border">
          <h1 className="text-2xl font-bold text-green-600">Response Submitted!</h1>
          <p className="text-gray-600 mt-2">Thank you for filling out {form.title}. Your response has been recorded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow-md border border-gray-200">
        <div className="mb-8 border-b border-gray-200 pb-6 border-t-8 border-t-blue-600 pt-4 rounded-t">
          <h1 className="text-3xl font-bold text-gray-900">{form.title}</h1>
          {form.description && <p className="mt-2 text-gray-600">{form.description}</p>}
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200 text-red-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {form.questions?.map((q: any) => (
            <div key={q.id} className="flex flex-col gap-2">
              {q.type === "SECTION_HEADER" ? (
                <div className="border-l-4 border-blue-600 bg-blue-50/60 p-4 rounded-r-md my-2">
                  <h2 className="text-xl font-bold text-blue-900">{q.title}</h2>
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
                  onChange={(e) => handleInputChange(q.id, e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Your answer"
                />
              )}

              {q.type === "LONG_TEXT" && (
                <textarea
                  required={q.required}
                  rows={3}
                  onChange={(e) => handleInputChange(q.id, e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Your answer"
                />
              )}

              {q.type === "NUMBER" && (
                <input
                  type="number"
                  required={q.required}
                  onChange={(e) => handleInputChange(q.id, e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0"
                />
              )}

              {q.type === "SINGLE_CHOICE" && (
                <div className="flex flex-col gap-2">
                  {q.options?.map((opt: any) => (
                    <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={q.id}
                        required={q.required}
                        value={opt.text}
                        onChange={(e) => handleInputChange(q.id, e.target.value)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="text-gray-700">{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === "DROPDOWN" && (
                <select
                  required={q.required}
                  onChange={(e) => handleInputChange(q.id, e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Choose an option</option>
                  {q.options?.map((opt: any) => (
                    <option key={opt.id} value={opt.text}>{opt.text}</option>
                  ))}
                </select>
              )}
            </div>
          ))}

          <div className="pt-4">
            <button type="submit" className="rounded bg-blue-600 px-6 py-2.5 font-medium text-white shadow hover:bg-blue-700 transition-colors">
              Submit Response
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}