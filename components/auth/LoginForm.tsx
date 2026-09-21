"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";

export function LoginForm() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) return setError("Email is required.");
    if (!password) return setError("Password is required.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setError(error.message);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-border bg-white p-6 shadow-card"
      noValidate
    >
      <h1 className="text-lg font-semibold text-ink-900">Log in</h1>
      <p className="mt-1 text-2xs text-ink-500">
        Sign in to your ALLTRADES workspace.
      </p>

      <div className="mt-5 space-y-4">
        <Field label="Email" htmlFor="email" required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={!!error && !email.trim()}
            placeholder="you@example.com"
          />
        </Field>

        <Field label="Password" htmlFor="password" required>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={!!error && !password}
            placeholder="••••••••"
          />
        </Field>

        {error && (
          <div className="rounded border border-loss-border bg-loss-bg px-3 py-2 text-2xs text-loss-text">
            {error}
          </div>
        )}

        <Button
          type="submit"
          loading={loading}
          className="w-full"
          size="lg"
        >
          Log in
        </Button>
      </div>

      <div className="mt-5 border-t border-border pt-4 text-center text-2xs text-ink-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-brand-700 hover:text-brand-800"
        >
          Create one
        </Link>
      </div>
    </form>
  );
}
