"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";

import { createAccount, signIn, type AuthFormState } from "../actions";

type Mode = "sign-in" | "create";

export function SignInForm({ mode, next }: { mode: Mode; next: string | null }) {
  const action = mode === "create" ? createAccount : signIn;
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state?.error ? (
        <Notice tone="incorrect" title="Could not continue" role="alert">
          {state.error}
        </Notice>
      ) : null}
      {state?.notice ? (
        <Notice tone="warning" title="One more step" role="status">
          {state.notice}
        </Notice>
      ) : null}

      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        defaultValue={state?.email ?? ""}
        error={state?.fieldErrors?.email}
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete={mode === "create" ? "new-password" : "current-password"}
        required
        minLength={mode === "create" ? 10 : undefined}
        hint={mode === "create" ? "At least 10 characters." : undefined}
        error={state?.fieldErrors?.password}
      />

      <Button type="submit" disabled={pending} className="w-full">
        {pending
          ? mode === "create"
            ? "Creating your account"
            : "Signing in"
          : mode === "create"
            ? "Create account"
            : "Sign in"}
      </Button>

      <p className="text-center text-sm text-ink-muted">
        {mode === "create" ? (
          <>
            Already have an account?{" "}
            <Link href="/sign-in" className="font-medium text-accent hover:text-accent-strong">
              Sign in
            </Link>
          </>
        ) : (
          <>
            First time here?{" "}
            <Link
              href="/sign-in?mode=create"
              className="font-medium text-accent hover:text-accent-strong"
            >
              Create your account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
