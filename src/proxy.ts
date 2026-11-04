import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // Local mode (development and tests only) has no sign-in.
  if (process.env.DERIVE_LOCAL_STORE === "1") {
    if (process.env.VERCEL) {
      return new NextResponse("DERIVE_LOCAL_STORE must never be set on Vercel.", { status: 500 });
    }
    return NextResponse.next();
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static files, images, the Python runtime and workers.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|pyodide/|workers/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2|wasm|whl|zip|json)$).*)",
  ],
};
