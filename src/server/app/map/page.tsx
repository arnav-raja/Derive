import { permanentRedirect } from "next/navigation";

// The Map became the Curriculum, with a page for each course.
export default function MapPage() {
  permanentRedirect("/curriculum");
}
