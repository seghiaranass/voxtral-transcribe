import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Dashboard placeholder — the upload form + recent history land here in Phase 4/5.
export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Signed in as {session?.user?.email}. Upload audio to transcribe with Voxtral.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming up</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Upload &amp; transcription land in the next build phase.
        </CardContent>
      </Card>
    </div>
  );
}
