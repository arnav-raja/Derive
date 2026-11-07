import { WiredPage } from "@/components/shell/wired-page";

/*
 * GitHub Pages serves this page (404.html) for any address it has no file
 * for. It still asks Derive's server, which knows every page: a lesson
 * written after the site was built opens here, and an address with no page
 * gets the not-found panel.
 */
export default function NotFound() {
  return <WiredPage />;
}
