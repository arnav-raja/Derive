import { clientReference } from "@/server/wire/refs";

/* next/link is a client component: the browser renders the real one. */
const Link = clientReference("next/link#default");
export default Link;
