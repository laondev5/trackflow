import { redirect } from "next/navigation";

// proxy.ts redirects "/" before this renders; kept as a fallback.
export default function Home() {
  redirect("/today");
}
