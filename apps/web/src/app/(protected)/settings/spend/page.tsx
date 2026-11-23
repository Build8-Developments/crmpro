import { redirect } from "next/navigation";

/** Marketing spend moved out of Settings to the sidebar (Manage → Marketing spend). */
export default function OldSpendSettingsPage() {
  redirect("/marketing-spend");
}
