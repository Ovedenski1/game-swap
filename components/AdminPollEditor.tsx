// components/AdminPollEditor.tsx
"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";

import NewsImageUpload from "@/components/NewsImageUpload";
import GalleryImageUpload from "@/components/GalleryImageUpload";

import type { PollStatus } from "@/lib/actions/admin-polls";
import { adminCreatePoll, adminUpdatePoll } from "@/lib/actions/admin-polls";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type EditorPoll = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  hero_image_url: string;
  card_image_url: string;

  status: PollStatus;

  // starts_at removed from UI; kept for edit compatibility only
  starts_at: Date | null;
  ends_at: Date | null;

  questions: {
    prompt: string;
    options: {
      label: string;
      style: "text" | "image";
      image_url: string;
    }[];
  }[];
};

type CreatePollPayload = Parameters<typeof adminCreatePoll>[0];

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return "Unknown error";
}

function toDateOrNull(value?: unknown) {
  if (!value) return null;
  const d = new Date(value as string | number | Date);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatTimeHHMM(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function buildLocalDate(date: Date, time: string) {
  const parts = time.split(":");
  const hh = Number(parts[0] ?? 0);
  const mm = Number(parts[1] ?? 0);
  const ss = Number(parts[2] ?? 0);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    Number.isFinite(hh) ? hh : 0,
    Number.isFinite(mm) ? mm : 0,
    Number.isFinite(ss) ? ss : 0,
    0,
  );
}

function prettyDate(d: Date | null) {
  if (!d) return "Pick a date";
  try {
    return d.toLocaleDateString();
  } catch {
    return "Pick a date";
  }
}

function getTimeValue(d: Date | null) {
  if (!d) return "00:00";
  return formatTimeHHMM(d);
}

const inputClasses = [
  "bg-transparent text-foreground",
  "border border-border/40 hover:border-bronze/40",
  "placeholder:text-text-muted",
  "shadow-[0_0_0_1px_rgba(236,167,44,0)]",
  "focus-visible:ring-2 focus-visible:ring-bronze/45 focus-visible:border-bronze/55",
].join(" ");

const textareaClasses = [
  "w-full rounded-md bg-transparent px-3 py-2 text-sm text-foreground min-h-[110px]",
  "border border-border/40 hover:border-bronze/40",
  "placeholder:text-text-muted outline-none",
  "focus:ring-2 focus:ring-bronze/45 focus:border-bronze/55",
].join(" ");

function SectionShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-transparent">
      <div className="text-center">
        <div className="mx-auto mb-3 h-[2px] w-16 rounded-full bg-bronze/80" />
        <h2
          className={[
            "text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase",
            "tracking-tight text-foreground leading-none",
            "[text-shadow:0_2px_0_rgba(0,0,0,0.35)]",
          ].join(" ")}
        >
          {title}
        </h2>
      </div>

      <div className="mt-6 rounded-2xl bg-transparent p-4 sm:p-5">{children}</div>
    </section>
  );
}

function DateAndTimeField({
  label,
  value,
  onChange,
  compact,
}: {
  label: string;
  value: Date | null;
  onChange: (d: Date | null) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [typedTime, setTypedTime] = useState<string>(() => getTimeValue(value));
  const timeValue = value ? getTimeValue(value) : typedTime;

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <Label className="text-xs text-text-muted">{label}</Label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={[
                "justify-between bg-transparent text-foreground",
                "border border-border/40 hover:border-bronze/40 hover:bg-transparent",
                "focus-visible:ring-2 focus-visible:ring-bronze/45",
              ].join(" ")}
            >
              <span className="text-text-soft">{prettyDate(value)}</span>
              <ChevronDownIcon className="opacity-80 text-bronze" />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="w-auto overflow-hidden p-0 bg-popover border-border/50"
            align="start"
          >
            <Calendar
              mode="single"
              selected={value ?? undefined}
              onSelect={(d) => {
                if (!d) return;
                const next = buildLocalDate(d, timeValue || "00:00");
                onChange(next);
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>

        <Input
          type="time"
          step="60"
          value={timeValue}
          onChange={(e) => {
            const t = e.target.value || "00:00";
            setTypedTime(t);
            if (value) onChange(buildLocalDate(value, t));
          }}
          className={[inputClasses, "[color-scheme:dark]", "h-10"].join(" ")}
        />
      </div>
    </div>
  );
}

export default function AdminPollEditor({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: Partial<EditorPoll>;
}) {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const [error, setError] = useState<string | null>(null);

  const [saved, setSaved] = useState(false);
  const [savedText, setSavedText] = useState<string>("Saved ✓");
  const savedTimerRef = useRef<number | null>(null);

  const [poll, setPoll] = useState<EditorPoll>(() => ({
    id: initial?.id,
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    description: initial?.description ?? "",
    hero_image_url: initial?.hero_image_url ?? "",
    card_image_url: initial?.card_image_url ?? "",

    status: "published",

    starts_at: toDateOrNull(initial?.starts_at),
    ends_at: toDateOrNull(initial?.ends_at),

    questions:
      initial?.questions?.length
        ? initial.questions
        : [
            {
              prompt: "",
              options: [
                { label: "", style: "text", image_url: "" },
                { label: "", style: "text", image_url: "" },
              ],
            },
          ],
  }));

  function showBanner(text: string) {
    setSavedText(text);
    setSaved(true);
    if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    savedTimerRef.current = window.setTimeout(() => {
      setSaved(false);
      savedTimerRef.current = null;
    }, 2200);
  }

  function updateQuestion(idx: number, patch: Partial<EditorPoll["questions"][0]>) {
    setPoll((p) => {
      const next = [...p.questions];
      next[idx] = { ...next[idx], ...patch };
      return { ...p, questions: next };
    });
  }

  function updateOption(
    qi: number,
    oi: number,
    patch: Partial<EditorPoll["questions"][0]["options"][0]>,
  ) {
    setPoll((p) => {
      const nextQ = [...p.questions];
      const nextOpts = [...nextQ[qi].options];
      nextOpts[oi] = { ...nextOpts[oi], ...patch };
      nextQ[qi] = { ...nextQ[qi], options: nextOpts };
      return { ...p, questions: nextQ };
    });
  }

  function addQuestion() {
    setPoll((p) => ({
      ...p,
      questions: [
        {
          prompt: "",
          options: [
            { label: "", style: "text", image_url: "" },
            { label: "", style: "text", image_url: "" },
          ],
        },
        ...p.questions,
      ],
    }));
  }

  function removeQuestion(idx: number) {
    setPoll((p) => ({
      ...p,
      questions: p.questions.filter((_, i) => i !== idx),
    }));
  }

  function addOption(qi: number) {
    setPoll((p) => {
      const nextQ = [...p.questions];
      nextQ[qi] = {
        ...nextQ[qi],
        options: [{ label: "", style: "text", image_url: "" }, ...nextQ[qi].options],
      };
      return { ...p, questions: nextQ };
    });
  }

  function removeOption(qi: number, oi: number) {
    setPoll((p) => {
      const nextQ = [...p.questions];
      nextQ[qi] = {
        ...nextQ[qi],
        options: nextQ[qi].options.filter((_, i) => i !== oi),
      };
      return { ...p, questions: nextQ };
    });
  }

  const canSave = useMemo(() => {
    if (!poll.title.trim()) return false;
    if (!poll.ends_at) return false;

    if (!poll.questions.length) return false;

    for (const q of poll.questions) {
      if (!q.prompt.trim()) return false;
      if (!q.options || q.options.length < 2) return false;
      for (const o of q.options) {
        if (!o.label.trim()) return false;
        if (o.style === "image" && !o.image_url.trim()) return false;
      }
    }
    return true;
  }, [poll]);

  async function save() {
    if (savingRef.current) return;

    setError(null);
    setSaved(false);

    if (!canSave) return;

    savingRef.current = true;
    setSaving(true);

    try {
      const nowIso = new Date().toISOString();

      const payload: CreatePollPayload = {
        title: poll.title.trim(),
        slug: poll.slug.trim() || null,
        description: poll.description.trim() || null,
        hero_image_url: poll.hero_image_url.trim() || null,
        card_image_url: poll.card_image_url.trim() || null,

        status: "published" as PollStatus,

        starts_at: nowIso,
        ends_at: poll.ends_at ? poll.ends_at.toISOString() : null,

        questions: poll.questions.map((q, qi) => ({
          prompt: q.prompt.trim(),
          sort_order: qi + 1,
          options: q.options.map((o, oi) => ({
            label: o.label.trim(),
            style: o.style,
            image_url: o.image_url.trim() || null,
            sort_order: oi + 1,
          })),
        })),
      };

      if (mode === "create") {
        await adminCreatePoll(payload);

        showBanner("Created ✓ Redirecting…");
        window.setTimeout(() => {
          router.push("/admin/polls");
          router.refresh();
        }, 900);
      } else {
        if (!poll.id) throw new Error("Missing poll id.");
        await adminUpdatePoll(poll.id, payload);
        router.refresh();
        showBanner("Saved ✓");
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  }

  const outlineBtn = [
    "bg-transparent text-foreground",
    "border border-border/40 hover:border-bronze/45 hover:bg-transparent",
    "shadow-[0_0_0_1px_rgba(236,167,44,0)] hover:shadow-[0_0_0_1px_rgba(236,167,44,0.18)]",
    "focus-visible:ring-2 focus-visible:ring-bronze/45",
  ].join(" ");

  return (
    <div className="space-y-8">
      {/* Sticky top buttons: Back + Save */}
      <div className="sticky top-3 z-30 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/polls")}
          className={[
            outlineBtn,
            "rounded-full px-4",
            "hover:shadow-[0_10px_30px_rgba(236,167,44,0.10)]",
          ].join(" ")}
        >
          ← Back to polls
        </Button>

        <Button
          type="button"
          onClick={save}
          disabled={saving || !canSave}
          className={[
            "bg-bronze text-shadow hover:bg-bronze/90 disabled:opacity-60",
            "shadow-[0_10px_30px_rgba(236,167,44,0.22)]",
            "rounded-full px-5",
          ].join(" ")}
        >
          {saving ? "Saving…" : mode === "create" ? "Create poll" : "Save changes"}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-paprika/50 bg-transparent px-4 py-3 text-sm text-foreground">
          <span className="text-paprika font-semibold">Error:</span>{" "}
          <span className="text-text-soft">{error}</span>
        </div>
      )}

      {saved && (
        <div className="rounded-xl border border-bronze/50 bg-transparent px-4 py-3 text-sm text-foreground">
          <span className="text-bronze font-semibold">{savedText}</span>
        </div>
      )}

      <SectionShell title={mode === "create" ? "Create Poll" : "Edit Poll"}>
        <div className="grid gap-4 md:grid-cols-[1.3fr_1fr] items-end">
          <div className="space-y-2">
            <Label className="text-xs text-text-muted">Title</Label>
            <Input
              value={poll.title}
              onChange={(e) => setPoll((p) => ({ ...p, title: e.target.value }))}
              placeholder="Game of the Year"
              className={inputClasses}
            />
          </div>

          <DateAndTimeField
            label="Ends"
            value={poll.ends_at}
            onChange={(d) => setPoll((p) => ({ ...p, ends_at: d }))}
            compact
          />
        </div>

        <div className="space-y-2 mt-4">
          <Label className="text-xs text-text-muted">Description (optional)</Label>
          <textarea
            className={textareaClasses}
            value={poll.description}
            onChange={(e) => setPoll((p) => ({ ...p, description: e.target.value }))}
            placeholder="Write a short paragraph..."
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <NewsImageUpload
            label="Hero image (optional)"
            value={poll.hero_image_url}
            onChange={(url) => setPoll((p) => ({ ...p, hero_image_url: url }))}
          />
          <NewsImageUpload
            label="Card background (optional)"
            value={poll.card_image_url}
            onChange={(url) => setPoll((p) => ({ ...p, card_image_url: url }))}
          />
        </div>
      </SectionShell>

      <div className="my-2 h-px w-full bg-border/40" />

      <SectionShell title="Questions">
        <div className="mt-4 space-y-5">
          {poll.questions.map((q, qi) => (
            <div key={qi} className="rounded-2xl bg-transparent p-4 sm:p-5 space-y-4">
              <div className="h-px w-full bg-border/30" />

              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-foreground">
                  <span className="text-bronze">Question {qi + 1}</span>
                </div>

                {poll.questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(qi)}
                    className="text-xs text-text-muted hover:text-paprika underline underline-offset-4"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-text-muted">Prompt</Label>
                <Input
                  value={q.prompt}
                  onChange={(e) => updateQuestion(qi, { prompt: e.target.value })}
                  placeholder="Which game should win?"
                  className={inputClasses}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">
                  Options <span className="text-text-muted">(min 2)</span>
                </div>
              </div>

              <div className="space-y-3">
                {q.options.map((o, oi) => (
                  <div key={oi} className="rounded-xl bg-transparent p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-text-muted">Option {oi + 1}</div>
                      {q.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(qi, oi)}
                          className="text-xs text-text-muted hover:text-paprika underline underline-offset-4"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-xs text-text-muted">Label</Label>
                        <Input
                          value={o.label}
                          onChange={(e) => updateOption(qi, oi, { label: e.target.value })}
                          placeholder="Elden Ring"
                          className={inputClasses}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-text-muted">Style</Label>

                        <select
                          className={[
                            "w-full rounded-md px-3 py-2 text-sm",
                            "bg-transparent text-foreground",
                            "border border-border/40 hover:border-bronze/40",
                            "outline-none focus:ring-2 focus:ring-bronze/45 focus:border-bronze/55",
                            "[color-scheme:dark]",
                          ].join(" ")}
                          value={o.style}
                          onChange={(e) =>
                            updateOption(qi, oi, { style: e.target.value as "text" | "image" })
                          }
                        >
                          <option value="text">text</option>
                          <option value="image">image card</option>
                        </select>

                        <style jsx>{`
                          select option {
                            background: rgba(34, 30, 34, 0.96);
                            color: rgba(255, 255, 255, 0.92);
                          }
                        `}</style>
                      </div>
                    </div>

                    {o.style === "image" && (
                      <div className="pt-2">
                        <GalleryImageUpload
                          label="Option image"
                          value={o.image_url}
                          onChange={(url) => updateOption(qi, oi, { image_url: url })}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addOption(qi)}
                  className={outlineBtn}
                >
                  + Add option
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="text-xs text-text-muted">
            {canSave ? <span className="text-bronze">Ready to save.</span> : "Complete the required fields to enable saving."}
          </div>

          <Button type="button" variant="outline" onClick={addQuestion} className={outlineBtn}>
            + Add question
          </Button>
        </div>
      </SectionShell>
    </div>
  );
}
