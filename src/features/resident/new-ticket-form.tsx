"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AccessOption {
  unitId: string;
  label: string;
}

export function NewTicketForm({
  accesses,
  defaultUnitId,
}: {
  accesses: AccessOption[];
  defaultUnitId: string;
}) {
  const router = useRouter();
  const [unitId, setUnitId] = useState(defaultUnitId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setOk(false);
    try {
      const form = new FormData();
      form.append("unitId", unitId);
      form.append("title", title.trim());
      form.append("description", description.trim());
      if (photos) {
        for (const file of Array.from(photos).slice(0, 5)) {
          form.append("photos", file);
        }
      }
      const res = await fetch("/api/v1/public/resident/tickets", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(j.error?.message ?? `HTTP ${res.status}`);
      }
      setOk(true);
      setTitle("");
      setDescription("");
      setPhotos(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {ok ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Prijava je uspešno poslata upravniku.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <div className="space-y-1">
        <Label htmlFor="unitId">Posebni deo</Label>
        <select
          id="unitId"
          value={unitId}
          onChange={(e) => setUnitId(e.currentTarget.value)}
          required
          className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
        >
          {accesses.map((a) => (
            <option key={a.unitId} value={a.unitId}>
              {a.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="title">Kratak opis</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          required
          maxLength={200}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Detaljnije</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          rows={6}
          maxLength={5000}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="photos">Fotografije (do 5)</Label>
        <input
          id="photos"
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setPhotos(e.currentTarget.files)}
          className="block w-full text-sm"
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Slanje…" : "Pošalji prijavu"}
        </Button>
      </div>
    </form>
  );
}
