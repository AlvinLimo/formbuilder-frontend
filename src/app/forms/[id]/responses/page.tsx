"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface ResponseItem {
  id: string;
  submittedAt: string;
  answers: Record<string, any>;
}

export default function FormResponsesPage() {
  const params = useParams();
  const formId = params?.id as string;

  const [form, setForm] = useState<any>(null);
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!formId) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/forms/${formId}/responses`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          
          // Map backend form response to match frontend expectations
          setForm({
            title: data.title,
            description: data.description,
            questions: data.questions.map((q: any) => ({
              id: q.id,
              title: q.text,
              type: q.type,
              required: q.required,
              options: q.options || [],
            })),
          });

          // Map database responses (transforming answers array to a dictionary object: { [questionId]: value })
          const formattedResponses = (data.responses || []).map((r: any) => {
            const answerMap: Record<string, any> = {};
            r.answers.forEach((ans: any) => {
              answerMap[ans.questionId] = ans.value;
            });

            return {
              id: r.id,
              submittedAt: r.createdAt,
              answers: answerMap,
            };
          });

          setResponses(formattedResponses);
        } else {
          const errData = await res.json().catch(() => ({}));
          setError(errData.error || "Failed to load responses. Please check if the form exists.");
        }
      })
      .catch((err) => {
        console.error("Network error:", err);
        setError("Could not connect to the backend database.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [formId]);

  const exportToCSV = () => {
    if (!responses || responses.length === 0) {
      alert("No responses to export yet!");
      return;
    }

    if (!form || !form.questions) {
      alert("Form structure could not be loaded.");
      return;
    }

    const validQuestions = form.questions.filter((q: any) => q.type !== "SECTION_HEADER");
    const headers = ["Submission ID", "Submitted At", ...validQuestions.map((q: any) => `"${(q.title || "Untitled").replace(/"/g, '""')}"`)];
    
    const rows = responses.map((res) => {
      const time = `"${new Date(res.submittedAt).toLocaleString()}"`;
      const answerCols = validQuestions.map((q: any) => {
        const val = res.answers?.[q.id] || "";
        const formattedVal = Array.isArray(val) ? val.join(", ") : val;
        return `"${String(formattedVal).replace(/"/g, '""')}"`;
      });
      return [`"${res.id}"`, time, ...answerCols].join(",");
    });

    const csvString = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${(form?.title || "form").replace(/[^a-z0-9]/gi, '_').toLowerCase()}_responses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render Loading State
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-gray-500 animate-pulse">Loading form responses from database...</p>
      </div>
    );
  }

  // Render Error State
  if (error || !form) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="rounded-lg bg-red-50 p-6 text-center border border-red-200">
          <h2 className="text-lg font-bold text-red-700">Oops!</h2>
          <p className="text-red-600 mt-2">{error || "Form not found"}</p>
          <Link href="/" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">
            ← Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const validQuestions = form.questions?.filter((q: any) => q.type !== "SECTION_HEADER") || [];

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href={`/forms/${formId}/builder`} className="text-sm font-medium text-blue-600 hover:underline">← Back to Builder</Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Responses for: {form.title}</h1>
          <p className="text-gray-600 mt-1">Total Submissions: <span className="font-semibold text-gray-900">{responses.length}</span></p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            className="rounded bg-green-600 px-5 py-2.5 font-medium text-white shadow hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            📊 Export to CSV
          </button>
        </div>
      </div>

      {responses.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
          <h3 className="text-lg font-medium text-gray-700">No responses yet</h3>
          <p className="text-sm text-gray-400 mt-1">Share your published public form link to start collecting answers.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="p-4">#</th>
                <th className="p-4">Submitted At</th>
                {validQuestions.map((q: any) => (
                  <th key={q.id} className="p-4 max-w-xs truncate">{q.title}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
              {responses.map((res, index) => (
                <tr key={res.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-500">{index + 1}</td>
                  <td className="p-4 whitespace-nowrap text-gray-500">{new Date(res.submittedAt).toLocaleString()}</td>
                  {validQuestions.map((q: any) => (
                    <td key={q.id} className="p-4 max-w-xs truncate">
                      {res.answers[q.id] !== undefined && res.answers[q.id] !== "" 
                        ? (Array.isArray(res.answers[q.id]) ? res.answers[q.id].join(", ") : res.answers[q.id])
                        : <span className="text-gray-300 italic">No answer</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}