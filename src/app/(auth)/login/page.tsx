"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import type { PublicUser } from "@/lib/types";
import { useSession } from "@/store/session";
import { Card, CardContent } from "@/components/ui/card";
import { FormError, FormField, SubmitButton } from "@/components/auth/auth-form";

function LoginForm() {
  const params = useSearchParams();
  const setUser = useSession((s) => s.setUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const { user } = await api<{ user: PublicUser }>("/api/auth/login", {
        method: "POST",
        body: { email: form.get("email"), password: form.get("password") },
      });
      setUser(user);
      const next = params.get("next");
      // Full navigation so the proxy sees the new cookie.
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/today";
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold">Welcome back</h2>
          <FormError message={error} />
          <FormField id="email" label="Email" type="email" autoComplete="email" required />
          <FormField
            id="password"
            label={
              <span className="flex w-full items-center justify-between">
                Password
                <Link href="/forgot-password" className="text-xs font-normal text-primary hover:underline">
                  Forgot password?
                </Link>
              </span>
            }
            type="password"
            autoComplete="current-password"
            required
          />
          <SubmitButton loading={loading}>Log in</SubmitButton>
          <p className="text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
