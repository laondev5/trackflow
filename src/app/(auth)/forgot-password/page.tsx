"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { FormError, FormField, SubmitButton } from "@/components/auth/auth-form";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ message: string }>("/api/auth/forgot-password", { method: "POST", body: { email: form.get("email") } });
      setSent(res.message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        {sent ? (
          <div className="space-y-3 text-center">
            <MailCheck className="mx-auto size-10 text-primary" />
            <h2 className="text-lg font-semibold">Check your email</h2>
            <p className="text-sm text-muted-foreground">{sent}</p>
            <Link href="/login" className="inline-block text-sm font-medium text-primary hover:underline">
              Back to log in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Reset password</h2>
              <p className="text-sm text-muted-foreground">We&apos;ll email you a link to choose a new one.</p>
            </div>
            <FormError message={error} />
            <FormField id="email" label="Email" type="email" autoComplete="email" required />
            <SubmitButton loading={loading}>Send reset link</SubmitButton>
            <p className="text-center text-sm">
              <Link href="/login" className="font-medium text-primary hover:underline">
                Back to log in
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
