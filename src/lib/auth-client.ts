import { z } from "zod";

import { LOCAL_MODE } from "@/lib/public-config";
import { browserAuth, publicRpc } from "@/lib/supabase/browser";

/*
 * Signing in, creating Derive's one account and signing out, in the browser.
 * The session is Supabase's, kept in this browser; every request to Derive's
 * server carries its access token, which the server verifies. The database
 * admits exactly one account, whatever the browser does.
 */

export type AuthFormState = {
  error?: string;
  fieldErrors?: { email?: string; password?: string };
  notice?: string;
  email?: string;
} | null;

const credentials = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: "Enter a valid email address." })),
  password: z.string().min(1, { message: "Enter your password." }),
});

const newAccount = credentials.extend({
  password: z
    .string()
    .min(10, { message: "Use at least 10 characters." })
    .max(72, { message: "Use at most 72 characters." }),
});

/** Only same-site paths, so a crafted link cannot send you elsewhere. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : "/today";
}

type AuthErrorLike = { code?: string; message?: string; status?: number } | null;

function describe(error: AuthErrorLike): string {
  const code = error?.code ?? "";
  const message = error?.message ?? "";
  switch (code) {
    case "invalid_credentials":
      return "That email and password do not match.";
    case "email_not_confirmed":
      return "This account's email address has not been confirmed yet.";
    case "user_already_exists":
    case "email_exists":
      return "An account with this email already exists. Sign in instead.";
    case "weak_password":
      return "Choose a stronger password: at least 10 characters.";
    case "signup_disabled":
      return "Derive is not open for new accounts.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Wait a minute, then try again.";
    case "email_address_not_authorized":
      return "Supabase could not send a confirmation email to this address.";
  }
  // The database admits one account, for one address, and refuses the rest.
  if (/database error saving new user/i.test(message)) {
    return "Derive is private, and this email cannot create an account on it.";
  }
  return "Something went wrong while signing in. Try again in a moment.";
}

function readCredentials(formData: FormData, schema: typeof credentials | typeof newAccount) {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (parsed.success) return { ok: true as const, data: parsed.data };
  const fieldErrors: { email?: string; password?: string } = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if ((key === "email" || key === "password") && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return { ok: false as const, fieldErrors };
}

type Navigate = (to: string) => void;

/** Whether Derive's one account exists, or null when that cannot be told. */
export async function accountExists(): Promise<boolean | null> {
  if (LOCAL_MODE) return null;
  try {
    const open = await publicRpc("signup_open");
    return typeof open === "boolean" ? !open : null;
  } catch {
    return null;
  }
}

export async function signIn(_prev: AuthFormState, formData: FormData, navigate: Navigate): Promise<AuthFormState> {
  if (LOCAL_MODE) {
    navigate(safeNext(formData.get("next")));
    return null;
  }
  const email = String(formData.get("email") ?? "");
  const input = readCredentials(formData, credentials);
  if (!input.ok) return { fieldErrors: input.fieldErrors, email };

  const { error } = await browserAuth().signInWithPassword(input.data);
  if (error) return { error: describe(error), email };

  navigate(safeNext(formData.get("next")));
  return null;
}

export async function createAccount(_prev: AuthFormState, formData: FormData, navigate: Navigate): Promise<AuthFormState> {
  if (LOCAL_MODE) {
    navigate("/today");
    return null;
  }
  const email = String(formData.get("email") ?? "");
  const input = readCredentials(formData, newAccount);
  if (!input.ok) return { fieldErrors: input.fieldErrors, email };
  if ((await accountExists()) === true) {
    return { error: "Derive already has its account. Sign in instead.", email };
  }

  const auth = browserAuth();
  const { data, error } = await auth.signUp(input.data);
  if (error) return { error: describe(error), email };

  if (!data.session) {
    // The database confirms the learner's address as the account is created,
    // so signing in straight away normally succeeds.
    const signedIn = await auth.signInWithPassword(input.data);
    if (signedIn.error) {
      if (signedIn.error.code === "email_not_confirmed") {
        return {
          notice:
            "Your account exists, but its email address still needs confirming. Open the link Supabase sent you, then sign in.",
          email,
        };
      }
      return { error: describe(signedIn.error), email };
    }
  }

  navigate("/today");
  return null;
}
