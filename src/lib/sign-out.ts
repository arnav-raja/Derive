import { LOCAL_MODE } from "@/lib/public-config";
import { browserAuth } from "@/lib/supabase/browser";

/** Signs out of this browser, then goes to the sign-in page. */
export async function signOut(navigate: (to: string) => void): Promise<void> {
  if (!LOCAL_MODE) await browserAuth().signOut();
  navigate("/sign-in");
}
