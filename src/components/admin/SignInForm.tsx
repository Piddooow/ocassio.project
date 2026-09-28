"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormField, TextInput } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";

/**
 * Admin sign-in form (§27, §31.21): specific errors, pending state,
 * submit on Enter, and a redirect into the CMS on success.
 */
export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(
          String(body?.error ?? "Sign in failed. Check your details and try again."),
        );
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Sign in failed. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      data-sign-in-form
      className="mt-8 flex flex-col gap-5"
    >
      <FormField id="sign-in-email" label="Email" required>
        <TextInput
          id="sign-in-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@studio.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </FormField>
      <FormField id="sign-in-password" label="Password" required>
        <TextInput
          id="sign-in-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </FormField>
      {error ? (
        <p data-sign-in-error role="alert" className="text-caption text-error">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
