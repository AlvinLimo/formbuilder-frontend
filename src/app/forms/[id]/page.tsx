"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, Search } from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type FormItem = {
  id: string;
  title: string;
  description?: string | null;
  _count?: {
    questions: number;
    responses: number;
  };
};


export default function FormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadForms() {
      try {
        const response = await fetch(`${API_URL}/forms`, {
          credentials: "include",
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load forms.");
        }

        setForms(Array.isArray(data) ? data : data.forms || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not connect to the server."
        );
      } finally {
        setLoading(false);
      }
    }

    loadForms();
  }, [router]);

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
  const filteredForms = forms.filter((form) =>
    form.title.toLowerCase().includes(search.toLowerCase())
  );



  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-8 flex items-center justify-between">
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
              onClick={() => router.push("/login")}
              className="flex items-center gap-2 rounded-lg bg-zinc-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
            >
              Login
            </button>
          </div>
        </div>

        <button
          onClick={logout}
          className="rounded-lg border px-4 py-2"
        >
          Log out
        </button>
      </header>

      {error && (
        <p className="mb-4 text-red-600">{error}</p>
      )}

      <div className="mb-6">
        <button
          onClick={createForm}
          className="rounded-lg bg-blue-600 px-5 py-3 text-white"
        >
          + Create New Form
        </button>
      
        
      </div>

      {forms.length === 0 && !error ? (
        <p className="rounded-lg border p-6 text-gray-600">
          You have no forms yet. Create your first form to get started.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {forms.map((form) => (
            <article
              key={form.id}
              className="rounded-xl border p-5"
            >
              <h2 className="text-xl font-semibold">
                {form.title}
              </h2>

              <p className="mt-2 text-gray-600">
                {form.description || "No description"}
              </p>

              <p className="mt-3 text-sm text-gray-500">
                Questions: {form._count?.questions ?? 0}
                {" · "}
                Responses: {form._count?.responses ?? 0}
              </p>

              <div className="mt-4 flex flex-wrap gap-4">
                <Link
                  href={`/builder?id=${form.id}`}
                  className="text-blue-600 underline"
                >
                  Edit form
                </Link>

                <Link
                  href={`/forms/${form.id}`}
                  className="text-blue-600 underline"
                >
                  View form
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}