"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createInterview } from "@/lib/actions/interview.action";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function InterviewSetupForm() {
  const router = useRouter();
  const submitting = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const data = new FormData(event.currentTarget);
    submitting.current = true;
    setLoading(true);
    setError("");

    try {
      const result = await createInterview({
        role: String(data.get("role") || ""),
        level: String(data.get("level") || "Junior"),
        type: String(data.get("type") || "Technical"),
        techstack: String(data.get("techstack") || ""),
        amount: Number(data.get("amount")),
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push(`/interview/${result.interviewId}`);
      router.refresh();
    } catch {
      setError("Could not create the interview. Check your connection and try again.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl flex-col gap-5 rounded-2xl border border-light-800 p-6">
      <fieldset disabled={loading} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          Job role
          <Input name="role" placeholder="Frontend Developer" required minLength={2} maxLength={120} />
        </label>
        <label className="flex flex-col gap-2">
          Experience level
          <select name="level" defaultValue="Junior" className="rounded-md border border-light-800 bg-dark-200 p-3">
            <option>Junior</option><option>Mid-level</option><option>Senior</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          Interview focus
          <select name="type" defaultValue="Technical" className="rounded-md border border-light-800 bg-dark-200 p-3">
            <option>Technical</option><option>Behavioral</option><option>Mixed</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          Tech stack (comma separated, optional)
          <Input name="techstack" placeholder="React, TypeScript, Next.js" maxLength={1000} />
        </label>
        <label className="flex flex-col gap-2">
          Number of questions
          <Input name="amount" type="number" defaultValue={5} min={1} max={20} required />
        </label>
        <Button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Creating interview…" : "Create Interview"}
        </Button>
      </fieldset>
      {loading && <p role="status">Generating and saving your questions. This can take up to a minute.</p>}
      {error && <p role="alert" className="text-red-400">{error}</p>}
    </form>
  );
}
