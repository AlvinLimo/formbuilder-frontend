"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  FileText,
  MoreVertical,
  Search,
  Copy,
  Trash2,
  Pencil,
} from "lucide-react";

type Form = {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    questions: number;
    responses: number;
  };
};

export default function Home() {
  const router = useRouter();

  const [forms, setForms] = useState<Form[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Load forms from the backend
  useEffect(() => {
    async function loadForms() {
      try {
        const response = await fetch("http://localhost:4000/forms",
          { credentials: "include" }
        );

        if (!response.ok) {
          throw new Error("Failed to load forms");
        }

        const data = await response.json();
        setForms(data);
      } catch (error) {
        console.error("Failed to load forms:", error);
      } finally {
        setLoading(false);
      }
    }

    loadForms();
  }, []);

  // Create a new form in the database
  async function createForm() {
    try {
      const response = await fetch("http://localhost:4000/forms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Untitled form",
          description: null,
          questions: [],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create form");
      }

      const newForm = await response.json();

      // Add the newly created form to the dashboard
      setForms((currentForms) => [newForm, ...currentForms]);

      // Open the builder for this real database ID
      router.push(`/builder/${newForm.id}`);
    } catch (error) {
      console.error("Failed to create form:", error);
      alert("Could not create the form.");
    }
  }

  async function deleteForm(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this form?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:4000/forms/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete form");
      }

      setForms((currentForms) =>
        currentForms.filter((form) => form.id !== id)
      );
    } catch (error) {
      console.error("Failed to delete form:", error);
      alert("Could not delete the form.");
    }
  }

  async function duplicateForm(form: Form) {
    try {
      const response = await fetch(
        `http://localhost:4000/forms/${form.id}/duplicate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to duplicate form");
      }

      const duplicatedForm = await response.json();

      setForms((currentForms) => [
        duplicatedForm,
        ...currentForms,
      ]);
    } catch (error) {
      console.error("Failed to duplicate form:", error);
      alert("Could not duplicate the form.");
    }
  }

  const filteredForms = forms.filter((form) =>
    form.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
              <FileText size={20} className="text-white" />
            </div>

            <h1 className="text-xl font-semibold">Forms</h1>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-3">
            
            <button
              onClick={() => router.push("/login")}
              className="flex items-center gap-2 rounded-lg bg-zinc-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
            >
              Login
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold">Welcome to Forms</h1>
        <h2 className="mt-2 text-lg text-zinc-700">
          Create and manage your forms easily.
        </h2>
      </main>
      
    </div>
  );
}