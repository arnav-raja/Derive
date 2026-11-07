import { loadLesson, writtenLessons } from "@/lib/content/lesson";
import { anthropicKey, buildCommit, isLocalMode } from "@/lib/env";
import { accountExists } from "@/lib/supabase/signup";

/**
 * A public health check. It reports whether each service is reachable and
 * configured, and never returns a secret.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  let auth: Record<string, unknown> = { configured: Boolean(url && key) };
  if (url && key && !isLocalMode()) {
    try {
      const res = await fetch(`${url}/auth/v1/settings`, {
        headers: { apikey: key },
        signal: AbortSignal.timeout(5000),
      });
      const body = (await res.json()) as {
        disable_signup?: boolean;
        mailer_autoconfirm?: boolean;
        external?: { email?: boolean };
      };
      auth = {
        configured: true,
        reachable: res.ok,
        emailSignIn: body.external?.email ?? null,
        signupOpen: body.disable_signup === false,
        emailConfirmationRequired: body.mailer_autoconfirm === false,
        accountExists: await accountExists(),
      };
    } catch (error) {
      auth = { configured: true, reachable: false, error: String(error).slice(0, 120) };
    }
  }

  return Response.json(
    {
      ok: true,
      commit: buildCommit(),
      region: process.env.SB_REGION ?? null,
      localMode: isLocalMode(),
      auth,
      tutor: { configured: anthropicKey() !== null },
      lessons: {
        written: writtenLessons().length,
        ready: writtenLessons().filter((code) => loadLesson(code)?.file.status === "ready").length,
      },
      time: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
