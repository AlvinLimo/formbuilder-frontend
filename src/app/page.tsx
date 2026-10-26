"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface FormItem {
  id: string;
  title: string;
  description: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  updatedAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [forms, setForms] = useState<FormItem[]>([]);
  const [user, setUser] = useState<User | null>(null);

  // Fetch user and forms on mount
  useEffect(() => {
    // 1. Check for logged-in user
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // 2. Fetch forms
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/forms`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setForms(data);
        } else {
          // Fallback to local storage if API fails
          const savedForms = localStorage.getItem("my_forms");
          if (savedForms) setForms(JSON.parse(savedForms));
        }
      })
      .catch(() => {
        const savedForms = localStorage.getItem("my_forms");
        if (savedForms) setForms(JSON.parse(savedForms));
      });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const createNewForm = async () => {
    // Require users to be logged in before creating a form (optional but recommended)
    if (!user) {
      alert("Please log in or register to create a form.");
      router.push("/login");
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: "Untitled Form", 
          description: "", 
          status: "DRAFT",
          userId: user.id // Attach the form to the logged-in user
        })
      });
      if (res.ok) {
        const newForm = await res.json();
        router.push(`/forms/${newForm.id}/builder`);
        return;
      }
    } catch (err) {
      console.error("API create failed, using local fallback", err);
    }

    // Fallback local creation if backend route differs
    const newId = Date.now().toString();
    const newForm: FormItem = {
      id: newId,
      title: "Untitled Form",
      description: "",
      status: "DRAFT",
      updatedAt: new Date().toLocaleDateString()
    };
    const updated = [newForm, ...forms];
    setForms(updated);
    localStorage.setItem("my_forms", JSON.stringify(updated));
    router.push(`/forms/${newId}/builder`);
  };

  const deleteForm = async (id: string) => {
    if (confirm("Are you sure you want to delete this form?")) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/forms/${id}`, {
          method: "DELETE"
        });
      } catch (err) {
        console.error("Backend delete error", err);
      }
      setForms(forms.filter(f => f.id !== id));
      localStorage.setItem("my_forms", JSON.stringify(forms.filter(f => f.id !== id)));
    }
  };

  const togglePublishStatus = async (id: string) => {
    const target = forms.find(f => f.id === id);
    if (!target) return;
    const nextStatus: FormItem["status"] =
      target.status === "PUBLISHED" ? "CLOSED" : "PUBLISHED";

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/forms/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
    } catch (err) {
      console.error("Backend status update error", err);
    }

    const updated: FormItem[] = forms.map((f) =>
      f.id === id ? { ...f, status: nextStatus } : f
    );
    setForms(updated);
    localStorage.setItem("my_forms", JSON.stringify(updated));
  };

  return (
    <div className="mx-auto max-w-6xl p-8">
      {/* Top Navigation / Auth Bar */}
      <div className="mb-8 flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">FormBuilder</h1>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm font-medium text-gray-700">Hello, {user.name || user.email}</span>
              <button 
                onClick={handleLogout}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-blue-600 hover:underline">
                Log In
              </Link>
              <Link href="/register" className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">My Forms Dashboard</h2>
          <p className="text-gray-600 mt-1">Create, manage, publish, and track your dynamic forms.</p>
        </div>
        <button
          onClick={createNewForm}
          className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white shadow hover:bg-blue-700 transition-colors"
        >
          + Create New Form
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {forms.map((form) => (
          <div key={form.id} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  form.status === "PUBLISHED" ? "bg-green-100 text-green-700" :
                  form.status === "CLOSED" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {form.status || (form as any).isPublished ? "PUBLISHED" : "DRAFT"}
                </span>
                <span className="text-xs text-gray-400">
                  Updated: {new Date(form.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 truncate">{form.title || "Untitled Form"}</h2>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{form.description || "No description provided."}</p>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
              <div className="flex gap-4">
                <Link
                  href={`/forms/${form.id}/builder`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Edit
                </Link>
                <Link
                  href={`/forms/${form.id}/responses`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Responses
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => togglePublishStatus(form.id)}
                  className="text-xs font-medium text-gray-600 hover:text-gray-900 border px-2 py-1 rounded"
                >
                  {form.status === "PUBLISHED" || (form as any).isPublished ? "Close Form" : "Publish"}
                </button>
                <button
                  onClick={() => deleteForm(form.id)}
                  className="text-gray-400 hover:text-red-600 text-sm"
                  title="Delete Form"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}