"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, KeyRound, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type KeyStatus = { set: boolean; masked: string | null };

export function ApiKeyForm({ initial }: { initial: KeyStatus }) {
  const [status, setStatus] = React.useState<KeyStatus>(initial);
  const [value, setValue] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: value }),
      });
      const data = (await res.json()) as KeyStatus & { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Could not save the API key.");
        return;
      }
      setStatus({ set: data.set, masked: data.masked });
      setValue("");
      toast.success("API key saved and encrypted.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function onRemove() {
    setRemoving(true);
    try {
      const res = await fetch("/api/key", { method: "DELETE" });
      if (!res.ok) {
        toast.error("Could not remove the API key.");
        return;
      }
      setStatus({ set: false, masked: null });
      toast.success("API key removed.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Mistral API key
        </CardTitle>
        <CardDescription>
          Used server-side to call Voxtral. Stored encrypted (AES-256-GCM) and never shown again
          after saving. Get one from{" "}
          <a
            href="https://console.mistral.ai/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            console.mistral.ai
          </a>
          .
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSave}>
        <CardContent className="space-y-4">
          {status.set && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-muted-foreground">
                A key is configured:{" "}
                <span className="font-mono">{status.masked ?? "(unreadable — check APP_ENCRYPTION_KEY)"}</span>
              </span>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="apiKey">{status.set ? "Replace key" : "API key"}</Label>
            <Input
              id="apiKey"
              name="apiKey"
              type="password"
              autoComplete="off"
              placeholder="Paste your Mistral API key"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex items-center gap-2 pt-2">
          <Button type="submit" disabled={saving || !value.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {status.set ? "Update key" : "Save key"}
          </Button>
          {status.set && (
            <Button type="button" variant="destructive" onClick={onRemove} disabled={removing}>
              {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Remove
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
