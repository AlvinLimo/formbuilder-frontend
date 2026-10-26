"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import QuestionCard from "@/components/forms/QuestionCard";
import FormPreview from "@/components/forms/FormPreview";

export default function FormBuilderPage() {
  const params = useParams();
  const formId = params?.id as string;

  const [isPreview, setIsPreview] = useState(false);
  const [formTitle, setFormTitle] = useState("Untitled Form");
  const [formDescription, setFormDescription] = useState("");
  const [shareLink, setShareLink] = useState(""); // <-- NEW: State to hold our shareable link

  const [questions, setQuestions] = useState([
    {
      id: "1",
      title: "What is your name?",
      type: "SHORT_TEXT",
      required: false,
      validations: {},
      options: [{ id: "opt-1", text: "Option 1" }],
    }
  ]);

  useEffect(() => {
    if (!formId) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/forms/${formId}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.title) setFormTitle(data.title);
          if (data.description) setFormDescription(data.description);
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
          const errorText = await res.text();
          console.error(`Failed to load form from database (Status ${res.status}):`, errorText);
        }
      })
      .catch((err) => console.error("Network error loading form:", err));
  }, [formId]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const addQuestion = () => {
    const newQuestion = {
      id: Date.now().toString(),
      title: "New Question",
      type: "SHORT_TEXT",
      required: false,
      validations: {},
      options: [{ id: Date.now().toString(), text: "Option 1" }],
    };
    setQuestions([...questions, newQuestion]);
  };

  const duplicateQuestion = (id: string) => {
    const questionToDuplicate = questions.find(q => q.id === id);
    if (!questionToDuplicate) return;

    const duplicatedOptions = (questionToDuplicate.options || []).map((opt, idx) => ({
      id: `${Date.now()}-${idx}`,
      text: typeof opt === 'string' ? opt : (opt.text || "Option")
    }));

    const newQuestion = {
      ...questionToDuplicate,
      id: Date.now().toString(),
      options: duplicatedOptions,
    };

    const index = questions.findIndex(q => q.id === id);
    const newQuestions = [...questions];
    newQuestions.splice(index + 1, 0, newQuestion);
    setQuestions(newQuestions);
  };

  const updateQuestion = (id: string, updates: Partial<typeof questions[0]>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const updateValidation = (id: string, key: string, value: number | "") => {
    setQuestions(questions.map(q => q.id === id ? { ...q, validations: { ...q.validations, [key]: value } } : q));
  };

  const updateOptions = (id: string, newOptions: { id: string, text: string }[]) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, options: newOptions } : q));
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    const formattedQuestions = questions.map((q) => ({
      text: q.title,
      type: q.type,
      required: Boolean(q.required),
      options: (q.options || []).map((opt) => (typeof opt === 'string' ? opt : opt.text))
    }));

    const payload = { 
      title: formTitle, 
      description: formDescription, 
      questions: formattedQuestions 
    };
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/forms/${formId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert("Form saved successfully to the database!");
      } else {
        const errorData = await res.json();
        alert(`Failed to save to database: ${errorData.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Database save error:", err);
      alert("Failed to connect to backend server. Make sure it is running.");
    }
  };

  const handlePublish = async () => {
    if (!formId) {
      alert("Please save the form first to generate a valid ID.");
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/forms/${formId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      if (res.ok) {
        // Generate the link based on the current window location
        const link = `${window.location.origin}/forms/${formId}/view`;
        setShareLink(link);
        alert("Form published successfully! Anyone can now submit responses.");
      } else {
        const errorData = await res.json();
        alert(`Failed to publish: ${errorData.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Publish error:", err);
      alert("Failed to connect to backend server.");
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">
          {isPreview ? "Preview Mode" : "Builder"}
        </h1>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsPreview(!isPreview)} 
            className="rounded border border-gray-300 bg-white px-6 py-2 font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            {isPreview ? "Back to Editor" : "Preview"}
          </button>
          <button onClick={handleSave} className="rounded bg-green-600 px-6 py-2 font-medium text-white shadow hover:bg-green-700">
            Save Form
          </button>
          <button onClick={handlePublish} className="rounded bg-blue-600 px-6 py-2 font-medium text-white shadow hover:bg-blue-700">
            Publish Form
          </button>
        </div>
      </div>

      {/* NEW: Publish Success Banner */}
      {shareLink && (
        <div className="mb-6 rounded-md border border-green-200 bg-green-50 p-4">
          <h3 className="text-sm font-medium text-green-800">Form is Live! Share this link to collect responses:</h3>
          <div className="mt-2 flex gap-2">
            <input 
              type="text" 
              readOnly 
              value={shareLink} 
              className="w-full rounded border border-gray-300 bg-white p-2 text-sm text-gray-700 focus:outline-none"
            />
            <button 
              onClick={() => {
                navigator.clipboard.writeText(shareLink);
                alert("Link copied to clipboard!");
              }}
              className="shrink-0 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-green-700"
            >
              Copy Link
            </button>
          </div>
        </div>
      )}

      {isPreview ? (
        <FormPreview title={formTitle} description={formDescription} questions={questions} />
      ) : (
        <>
          <div className="mb-6 rounded-lg border border-gray-200 border-t-8 border-t-blue-600 bg-white p-6 shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
            <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Form Title" className="w-full border-b border-transparent bg-transparent pb-2 text-3xl font-bold text-gray-900 placeholder-gray-400 transition-colors hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-0" />
            <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Form Description (optional)" rows={2} className="mt-2 w-full resize-none border-b border-transparent bg-transparent pb-1 text-sm text-gray-600 placeholder-gray-400 transition-colors hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-0" />
          </div>

          <div className="mb-6">
            <button onClick={addQuestion} className="rounded bg-blue-600 px-4 py-2 text-white shadow hover:bg-blue-700">
              + Add Question
            </button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {questions.map((question) => {
                  const safeOptions = (question.options || []).map((opt, idx) => {
                    if (typeof opt === 'string') {
                      return { id: `opt-${idx}-${Date.now()}`, text: opt };
                    }
                    return { id: opt.id || `opt-${idx}`, text: opt.text || "Option" };
                  });

                  return (
                    <QuestionCard
                      key={question.id} 
                      id={question.id} 
                      title={question.title} 
                      type={question.type} 
                      required={question.required} 
                      validations={question.validations} 
                      options={safeOptions}
                      onTitleChange={(title) => updateQuestion(question.id, { title })}
                      onTypeChange={(type) => updateQuestion(question.id, { 
                        type, 
                        validations: {}, 
                        options: type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE" || type === "DROPDOWN" 
                          ? (safeOptions.length ? safeOptions : [{ id: Date.now().toString(), text: "Option 1" }]) 
                          : [] 
                      })}
                      onRequiredChange={(required) => updateQuestion(question.id, { required })}
                      onValidationChange={(key, value) => updateValidation(question.id, key, value)}
                      onOptionsChange={(options) => updateOptions(question.id, options)}
                      onDuplicate={() => duplicateQuestion(question.id)}
                      onDelete={() => deleteQuestion(question.id)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}
    </div>
  );
}