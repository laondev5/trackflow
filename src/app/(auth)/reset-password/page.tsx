"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { FormError, FormField, SubmitButton } from "@/components/auth/auth-form";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get("password") !== form.get("confirm")) return setError("Passwords don't match");
    setLoading(true);
    setError(null);
    try {
      await api("/api/auth/reset-password", { method: "POST", body: { token, password: form.get("password") } });
      window.location.href = "/today";
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Card>
        <CardContent className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground">This reset link is missing its token.</p>
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Request a new link
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold">Choose a new password</h2>
          <FormError message={error} />
          <FormField id="password" label="New password" type="password" autoComplete="new-password" minLength={8} required />
          <FormField id="confirm" label="Confirm password" type="password" autoComplete="new-password" minLength={8} required />
          <SubmitButton loading={loading}>Update password</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
