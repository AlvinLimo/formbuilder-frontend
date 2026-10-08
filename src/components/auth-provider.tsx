"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMe } from "@/lib/api";
import { getToken, SESSION_EXPIRED_EVENT, setToken } from "@/lib/session";
import type { AuthResult, AuthUser } from "@/lib/types";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  signIn: (result: AuthResult) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_PAGES = ["/login", "/register"];

function isPublicPath(pathname: string) {
  return pathname.startsWith("/f/") || AUTH_PAGES.includes(pathname);
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background" aria-label="Loading">
      <span className="size-8 animate-spin rounded-full border-2 border-muted border-t-brand" />
    </div>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    (getToken() ? getMe() : Promise.reject())
      .then(({ user: current }) => {
        setUser(current);
        setStatus("authenticated");
      })
      .catch(() => setStatus("anonymous"));
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    setStatus("anonymous");
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, signOut);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, signOut);
  }, [signOut]);

  const signIn = useCallback(
    (result: AuthResult) => {
      queryClient.clear();
      setToken(result.token);
      setUser(result.user);
      setStatus("authenticated");
    },
    [queryClient]
  );

  const publicPath = isPublicPath(pathname);
  const onAuthPage = AUTH_PAGES.includes(pathname);

  useEffect(() => {
    if (status === "anonymous" && !publicPath) {
      router.replace(pathname === "/" ? "/login" : `/login?next=${encodeURIComponent(pathname)}`);
    }

    if (status === "authenticated" && onAuthPage) {
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
    }
  }, [status, publicPath, onAuthPage, pathname, router]);

  const value = useMemo(() => ({ user, status, signIn, signOut }), [user, status, signIn, signOut]);

  const ready = publicPath ? !(onAuthPage && status === "authenticated") : status === "authenticated";

  return <AuthContext.Provider value={value}>{ready ? children : <FullPageSpinner />}</AuthContext.Provider>;
}
