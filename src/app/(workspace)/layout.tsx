import type { ReactNode } from "react";

import { requireSession } from "@/lib/auth";

/*
 * The lesson workspace has no sidebar: a phase fills the screen, with its
 * own bar across the top. Signing in is still required.
 */
export default async function WorkspaceLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireSession();
  return children;
}
