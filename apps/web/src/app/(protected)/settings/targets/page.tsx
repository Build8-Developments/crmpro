import { redirect } from "next/navigation";

/** Targets moved out of Settings to the sidebar (Manage → Targets). */
export default function OldTargetsSettingsPage() {
  redirect("/targets");
}
