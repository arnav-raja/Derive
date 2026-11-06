import type { Metadata } from "next";

import { Wordmark } from "@/components/shell/wordmark";
import { Notice } from "@/components/ui/notice";
import { accountExists } from "@/lib/supabase/signup";

import { BrandPanel } from "./brand-panel";
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
    <div className="grid min-h-dvh grid-cols-1 bg-paper lg:grid-cols-2">
      <BrandPanel />
      <main className="flex flex-col items-center justify-center px-4 py-12 sm:px-8">
        <div className="flex w-full max-w-sm flex-col">
          <div className="mb-10 flex flex-col items-center gap-3 text-center lg:hidden">
            <Wordmark size="lg" />
            <p className="max-w-xs text-sm text-ink-muted">
              Mathematics, machine learning and ML engineering, derived from first principles.
            </p>
          </div>

          <div className="mb-8 flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{creating ? "Create your account" : "Welcome back"}</h1>
            <p className="text-sm text-ink-muted">
              {creating ? "One account, for one learner. It takes a minute." : "Sign in to pick up where you left off."}
            </p>
          </div>

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

          <p className="mt-10 text-center text-xs text-ink-muted lg:hidden">Derive is a private school for one learner.</p>
        </div>
      </main>
    </div>
  );
}
