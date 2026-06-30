import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/session";
import { getMaskedApiKey } from "@/lib/api-key";
import { ApiKeyForm } from "@/components/settings/api-key-form";

export const metadata = { title: "Settings — Voxtral" };

export default async function SettingsPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const keyStatus = await getMaskedApiKey(userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your Mistral API key.</p>
      </div>
      <div className="max-w-xl">
        <ApiKeyForm initial={keyStatus} />
      </div>
    </div>
  );
}
