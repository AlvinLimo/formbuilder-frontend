"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function Home() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [forms, setForms] = useState<Form[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Load forms from the backend
  useEffect(() => {
    async function loadForms() {
      try {
        const response = await fetch(`${API_URL}/forms`, {
          credentials: "include"
        });

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
  //logout
  async function logout() {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    router.replace("/");
  }

  if (loading) {
    return <main className="p-8">Loading your forms...</main>;
  }
  // Create a new form in the database
 async function createForm() {
  try {
    setError("");

    const response = await fetch(`${API_URL}/forms`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Untitled form",
        description: "",
        questions: [],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      throw new Error(data.message || "Failed to create form.");
    }

    if (!data.id) {
      throw new Error("The server did not return a form ID.");
    }

    router.push(`/builder/${data.id}`);
  } catch (error) {
    setError(
      error instanceof Error
        ? error.message
        : "Could not create the form."
    );
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
        credentials: "include",
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
          credentials: "include",
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
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                type="text"
                placeholder="Search forms..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-48 rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              onClick={createForm}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Plus size={18} />
              Create form
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-lg bg-zinc-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Your forms</h2>

          <p className="mt-1 text-sm text-zinc-500">
            Create and manage your forms.
          </p>
        </div>

        {/* Create blank form */}
        <div className="mb-10">
          <button
            onClick={createForm}
            className="flex h-40 w-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-white transition hover:border-blue-500 hover:bg-blue-50"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Plus size={24} className="text-blue-600" />
            </div>

            <span className="font-medium">Blank form</span>

            <span className="mt-1 text-sm text-zinc-500">
              Create a new form
            </span>
          </button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-500">
            Loading forms...
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center">
            <FileText
              size={40}
              className="mx-auto mb-3 text-zinc-300"
            />

            <h3 className="font-medium">No forms found</h3>

            <p className="mt-1 text-sm text-zinc-500">
              Try a different search.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredForms.map((form) => (
              <div
                key={form.id}
                className="group overflow-hidden rounded-xl border border-zinc-200 bg-white transition hover:-translate-y-1 hover:shadow-md"
              >
                {/* Preview */}
                <button
                  onClick={() => router.push(`/builder/${form.id}`)}
                  className="flex h-36 w-full items-center justify-center bg-zinc-100 transition group-hover:bg-blue-50"
                >
                  <FileText
                    size={48}
                    className="text-zinc-400 group-hover:text-blue-500"
                  />
                </button>

                {/* Details */}
                <div className="flex items-start justify-between p-4">
                  <button
                    onClick={() => router.push(`/builder/${form.id}`)}
                    className="text-left"
                  >
                    <h3 className="font-medium hover:text-blue-600">
                      {form.title}
                    </h3>

                    <p className="mt-1 text-sm text-zinc-500">
                      {new Date(form.updatedAt).toLocaleString()}
                    </p>
                  </button>

                  {/* Menu */}
                  <div className="group/menu relative">
                    <button className="rounded-full p-2 hover:bg-zinc-100">
                      <MoreVertical size={18} />
                    </button>

                    <div className="invisible flex flex-row absolute right-10 top-5 z-6 w-44 rounded-lg border border-zinc-200 bg-white py-1 opacity-0 shadow-lg transition group-focus-within/menu:visible group-focus-within/menu:opacity-100">
                      <button
                        onClick={() =>
                          router.push(`/builder/${form.id}`)
                        }
                        className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-zinc-50"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => duplicateForm(form)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-zinc-50"
                      >
                        <Copy size={16} />
                      </button>

                      <button
                        onClick={() => deleteForm(form.id)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}


