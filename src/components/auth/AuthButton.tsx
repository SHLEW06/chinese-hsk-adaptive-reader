"use client";

import { LogIn, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "./AuthProvider";

function getSignInError(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error && "message" in error) {
    const { code, message } = error as { code: unknown; message: unknown };
    return `Google sign-in failed (${String(code)}): ${String(message)}`;
  }

  return `Google sign-in failed: ${error instanceof Error ? error.message : "Unknown error"}`;
}

export function AuthButton() {
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  if (loading) return <span className="text-xs text-muted">Loading account…</span>;

  const buttonClass = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink hover:border-seal";
  if (!user) return <div className="flex flex-col items-end gap-1"><button onClick={() => { setError(null); void signInWithGoogle().catch((err: unknown) => setError(getSignInError(err))); }} className={buttonClass}><LogIn size={15} /> Sign in with Google</button>{error && <span className="max-w-56 text-right text-[11px] text-seal">{error}</span>}</div>;

  return <div className="flex items-center gap-2"><span className="hidden max-w-32 truncate text-sm text-muted sm:block">{user.displayName || user.email}</span><button onClick={() => void signOutUser()} className={buttonClass}><LogOut size={15} /> Sign out</button></div>;
}
