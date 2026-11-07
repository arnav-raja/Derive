import "server-only";

/*
 * Server-side configuration. Public values (NEXT_PUBLIC_*) are safe in the
 * browser; everything else stays on the server. On the Supabase Edge Function
 * the public values are fixed when the function is built, and the Anthropic
 * key is a function secret.
 */

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/** True on the deployed Supabase Edge Function, where local mode must never run. */
export function isDeployed(): boolean {
  return process.env.DERIVE_DEPLOYED === "1";
}

/**
 * Local mode stores learner data in .derive-local/ and skips sign-in. It exists
 * for development and end-to-end tests only, and refuses to run when deployed.
 */
export function isLocalMode(): boolean {
  const on = process.env.DERIVE_LOCAL_STORE === "1";
  if (on && isDeployed()) {
    throw new ConfigError("DERIVE_LOCAL_STORE must never be set on the deployed server.");
  }
  return on;
}

export function supabaseConfig(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new ConfigError(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set.",
    );
  }
  return { url, key };
}

export function anthropicKey(): string | null {
  const key = process.env.ANTHROPIC_API_KEY;
  return key && key.length > 0 ? key : null;
}

/** The commit this server was built from, when the build recorded it. */
export function buildCommit(): string | null {
  return process.env.DERIVE_COMMIT?.slice(0, 7) || null;
}
