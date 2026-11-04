import type { Metadata } from "next";

import { Wordmark } from "@/components/shell/wordmark";
import { Notice } from "@/components/ui/notice";
import { accountExists } from "@/lib/supabase/signup";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

type Props = { searchParams: Promise<{ mode?: string; next?: string; link?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const { mode, next, link } = await searchParams;
  // Derive has exactly one account. Once it exists, only sign-in is offered.
  const exists = await accountExists();
  const canCreate = exists !== true;
  const creating = mode === "create" && canCreate;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <Wordmark size="lg" />
          <p className="max-w-xs text-sm text-ink-muted">
            Mathematics, machine learning and ML engineering, derived from first principles.
          </p>
        </div>

        <div className="rounded-lg border border-rule bg-surface p-6 shadow-sm sm:p-8">
          <h1 className="mb-6 text-xl font-semibold tracking-tight text-ink">
            {creating ? "Create your account" : "Sign in"}
          </h1>
          {link === "expired" ? (
            <Notice tone="warning" title="That link no longer works" className="mb-5">
              It has expired or was already used. Sign in with your email and password.
            </Notice>
          ) : null}
          {mode === "create" && !canCreate ? (
            <Notice tone="info" title="Your account is ready" className="mb-5">
              Derive already has its account. Sign in with it.
            </Notice>
          ) : null}
          <SignInForm
            key={creating ? "create" : "sign-in"}
            mode={creating ? "create" : "sign-in"}
            next={next ?? null}
            canCreate={canCreate}
          />
        </div>

        <p className="mt-6 text-center text-xs text-ink-faint">
          Derive is a private school for one learner.
        </p>
      </div>
    </main>
  );
}
