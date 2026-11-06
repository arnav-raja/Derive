import { redirect } from "next/navigation";

// Today is the front page; the layout sends visitors without a session to sign in first.
export default function Home() {
  redirect("/today");
}
