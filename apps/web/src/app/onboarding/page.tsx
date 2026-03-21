"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  processAndRenameCoursesIfNeeded,
  saveOnboardingSettings,
  validateAndFetchCourses,
} from "./actions";

type Step = "role" | "canvas" | "processing";
type Role = "student" | "teacher";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role>("student");
  const [domain, setDomain] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [processingStatus, setProcessingStatus] = useState("Connecting to Canvas...");
  const [isPending, startTransition] = useTransition();

  function handleRoleSelect(selected: Role) {
    setRole(selected);
    setStep("canvas");
  }

  function handleCanvasSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const cleanDomain = domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");

    startTransition(async () => {
      const result = await validateAndFetchCourses(apiKey.trim(), cleanDomain);

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Save settings to DB
      await saveOnboardingSettings({
        role,
        canvasApiKey: apiKey.trim(),
        canvasDomain: cleanDomain,
      });

      if (role === "teacher") {
        router.push("/");
        return;
      }

      // Student: process course names
      setStep("processing");
      setProcessingStatus("Checking your course names...");

      const { renamed } = await processAndRenameCoursesIfNeeded(
        result.courses,
        apiKey.trim(),
        cleanDomain,
      );

      if (renamed.length > 0) {
        setProcessingStatus(
          `Renamed ${renamed.length} course${renamed.length === 1 ? "" : "s"} to be more readable`,
        );
        await new Promise((r) => setTimeout(r, 1200));
      }

      router.push("/");
    });
  }

  if (step === "role") {
    return (
      <div className="flex min-h-full flex-col items-center justify-center p-8">
        <div className="w-full max-w-lg space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="font-bold text-3xl">Welcome</h1>
            <p className="text-muted-foreground">How are you using this?</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleRoleSelect("student")}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-transparent bg-muted p-8 transition-all hover:border-primary hover:bg-muted/70"
            >
              <span className="text-4xl">🎒</span>
              <span className="font-semibold text-lg">Student</span>
              <span className="text-center text-muted-foreground text-sm">
                Track assignments, study, and get help with coursework
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect("teacher")}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-transparent bg-muted p-8 transition-all hover:border-primary hover:bg-muted/70"
            >
              <span className="text-4xl">📚</span>
              <span className="font-semibold text-lg">Teacher</span>
              <span className="text-center text-muted-foreground text-sm">
                Manage courses, track student progress, and create materials
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "canvas") {
    return (
      <div className="flex min-h-full flex-col items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="font-bold text-3xl">Connect Canvas</h1>
            <p className="text-muted-foreground">
              Link your Canvas account to get started
            </p>
          </div>

          <form onSubmit={handleCanvasSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="domain">Canvas Domain</Label>
              <Input
                id="domain"
                placeholder="school.instructure.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={isPending}
                required
              />
              <p className="text-muted-foreground text-xs">
                Just the domain — no https:// needed
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Paste your Canvas access token"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isPending}
                required
              />
              <p className="text-muted-foreground text-xs">
                Generate one in Canvas → Account → Settings → New Access Token
              </p>
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-4 py-2 text-destructive text-sm">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("role")}
                disabled={isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? "Connecting..." : "Continue"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Processing step (students only)
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-muted-foreground">{processingStatus}</p>
      </div>
    </div>
  );
}
