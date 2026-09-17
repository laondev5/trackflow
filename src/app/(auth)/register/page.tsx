"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import type { PublicUser } from "@/lib/types";
import { useSession } from "@/store/session";
import { Card, CardContent } from "@/components/ui/card";
import { FormError, FormField, SubmitButton } from "@/components/auth/auth-form";

export default function RegisterPage() {
  const setUser = useSession((s) => s.setUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");

  const strength = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const { user } = await api<{ user: PublicUser }>("/api/auth/register", {
        method: "POST",
        body: {
          name: form.get("name"),
          email: form.get("email"),
          password,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      setUser(user);
      window.location.href = "/today";
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold">Create your account</h2>
          <FormError message={error} />
          <FormField id="name" label="Name" autoComplete="name" required maxLength={80} />
          <FormField id="email" label="Email" type="email" autoComplete="email" required />
          <div className="space-y-2">
            <FormField
              id="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {password && (
              <div className="flex gap-1" aria-label={`Password strength ${strength} of 4`}>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${i < strength ? (strength <= 1 ? "bg-red-500" : strength <= 2 ? "bg-amber-500" : "bg-emerald-500") : "bg-muted"}`}
                  />
                ))}
              </div>
            )}
          </div>
          <SubmitButton loading={loading}>Create account</SubmitButton>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
