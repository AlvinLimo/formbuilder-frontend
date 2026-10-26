"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import FormPreview from "@/components/forms/FormPreview";

export default function FormViewPage() {
  const params = useParams();
  const formId = params?.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [questions, setQuestions] = useState([]);
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (!formId) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/forms/${formId}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setFormTitle(data.title || "Untitled Form");
          setFormDescription(data.description || "");
          setIsPublished(data.isPublished);
          
          if (data.questions) {
            const mappedQuestions = data.questions.map((q: any) => ({
              id: q.id,
              title: q.text,
              type: q.type,
              required: q.required,
              validations: {},
              options: q.options?.map((opt: any) => ({ id: opt.id, text: opt.text })) || []
            }));
            setQuestions(mappedQuestions);
          }
        } else {
          setError("Form not found or could not be loaded.");
        }
      })
      .catch((err) => {
        console.error("Network error:", err);
        setError("Failed to connect to the server.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [formId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-lg font-medium text-gray-500 animate-pulse">Loading form...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md border-t-4 border-red-500">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Oops!</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!isPublished) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md border-t-4 border-yellow-500">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Not Available</h2>
          <p className="text-gray-600">This form is currently closed or has not been published yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* We reuse the FormPreview component we built, it already has the submit logic! */}
        <FormPreview 
          title={formTitle} 
          description={formDescription} 
          questions={questions} 
        />
      </div>
    </div>
  );
}