import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/session";
import { hasApiKey } from "@/lib/api-key";
import { UploadForm } from "@/components/upload/upload-form";

export default async function DashboardPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const keySet = await hasApiKey(userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Upload audio to transcribe with Voxtral.</p>
      </div>

      <UploadForm hasApiKey={keySet} />
    </div>
  );
}
