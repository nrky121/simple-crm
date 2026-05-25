import { redirect } from "next/navigation";

// Root page is handled by middleware — this is a fallback
export default function RootPage() {
  redirect("/dashboard");
}
