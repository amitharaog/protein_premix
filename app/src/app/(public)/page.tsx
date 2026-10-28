import { redirect } from "next/navigation";

// The survey is the only public page for now; the full landing page (SPEC §1.1) comes later.
export default function Home() {
  redirect("/survey");
}
