import { redirect } from "next/navigation";

// The proxy sends visitors without a session to sign in first.
export default function Home() {
  redirect("/today");
}
