"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login, register } from "@/lib/api";
import { BRAND } from "@/lib/brand";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { signIn } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === "register";

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      signIn(isRegister ? await register({ name, email, password }) : await login({ email, password }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Image src={BRAND.logo} alt={BRAND.name} width={120} height={40} priority />
          <h1 className="text-2xl font-bold tracking-tight">{isRegister ? "Create your account" : "Sign in"}</h1>
          <p className="text-sm text-muted-foreground">
            {isRegister ? "Build forms and collect responses." : `Welcome back to ${BRAND.product}.`}
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          {isRegister ? (
            <label className="block space-y-1.5 text-sm font-medium">
              <span>Name</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
            </label>
          ) : null}
          <label className="block space-y-1.5 text-sm font-medium">
            <span>Email</span>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            <span>Password</span>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={isRegister ? 8 : undefined}
              required
            />
            {isRegister ? <span className="block text-xs font-normal text-muted-foreground">At least 8 characters</span> : null}
          </label>

          {error ? (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {isRegister ? "Already have an account? " : "New here? "}
          <Link href={isRegister ? "/login" : "/register"} className="font-medium text-primary hover:underline">
            {isRegister ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </div>
  );
}
