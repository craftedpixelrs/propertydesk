import { redirect } from "next/navigation";

/** Legacy English route — permanently redirect to Serbian equivalent. */
export default function LegacyPlatformPage() {
  redirect("/administracija");
}
