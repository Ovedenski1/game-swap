"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { PollDetail, PollOption, PollQuestion } from "@/lib/polls/shared";
import { isPollActive } from "@/lib/polls/shared";
import { getMyVotes, getPollResultsPublic, submitPollVotes } from "@/lib/actions/polls";

type PollRunnerProps = {
  poll: PollDetail;
};

type ResultsRow = {
  question_id: string;
  option_id: string;
  votes: number;
  [key: string]: any;
};

export default function PollRunner({ poll }: PollRunnerProps) {
  const router = useRouter();
  const pathname = usePathname();

  const active = isPollActive({
    status: poll.status,
    starts_at: poll.starts_at,
    ends_at: poll.ends_at,
  });

  const [selections, setSelections] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [hasVoted, setHasVoted] = useState(false);

  const [resultsRows, setResultsRows] = useState<ResultsRow[] | null>(null);
  const [resultsError, setResultsError] = useState<string | null>(null);

  const questions = poll.questions ?? [];
  const options = poll.options ?? [];

  function goLogin() {
    const next = encodeURIComponent(pathname || `/polls/${poll.slug}`);
    router.push(`/auth?next=${next}`);
  }

  const optionsByQuestion = useMemo(() => {
    const map: Record<string, PollOption[]> = {};
    for (const q of questions) map[q.id] = [];
    for (const opt of options) {
      if (!map[opt.question_id]) map[opt.question_id] = [];
      map[opt.question_id].push(opt);
    }
    for (const qid of Object.keys(map)) {
      map[qid].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }
    return map;
  }, [questions, options]);

  useEffect(() => {
    setStep((s) => Math.max(0, Math.min(s, Math.max(0, questions.length - 1))));
  }, [questions.length]);

  const currentQuestion: PollQuestion | null = questions[step] ?? null;
  const currentOptions: PollOption[] = currentQuestion
    ? optionsByQuestion[currentQuestion.id] ?? []
    : [];

  const totalQuestions = questions.length;

  const isComplete = useMemo(() => {
    if (!questions.length) return false;
    return questions.every((q) => Boolean(selections[q.id]));
  }, [questions, selections]);

  function safeNumber(x: any) {
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
  }

  const resultsMap = useMemo(() => {
    const out: Record<string, Record<string, number>> = {};
    for (const q of questions) out[q.id] = {};
    if (!resultsRows) return out;

    for (const row of resultsRows) {
      const qid = String(row.question_id ?? "");
      const oid = String(row.option_id ?? "");
      const votes = safeNumber(row.votes);
      if (!qid || !oid) continue;
      if (!out[qid]) out[qid] = {};
      out[qid][oid] = votes;
    }
    return out;
  }, [questions, resultsRows]);

  const totalsByQuestion = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const q of questions) {
      const map = resultsMap[q.id] || {};
      totals[q.id] = Object.values(map).reduce((a, b) => a + b, 0);
    }
    return totals;
  }, [questions, resultsMap]);

  const winnersByQuestion = useMemo(() => {
    const out: Record<string, Set<string>> = {};
    for (const q of questions) {
      const opts = optionsByQuestion[q.id] ?? [];
      const map = resultsMap[q.id] || {};

      let maxVotes = -1;
      for (const opt of opts) {
        maxVotes = Math.max(maxVotes, safeNumber(map[opt.id]));
      }

      const set = new Set<string>();
      if (maxVotes >= 0) {
        for (const opt of opts) {
          const v = safeNumber(map[opt.id]);
          if (v === maxVotes && maxVotes > 0) set.add(opt.id);
        }
      }

      out[q.id] = set;
    }
    return out;
  }, [questions, optionsByQuestion, resultsMap]);

  async function loadMyStateAndMaybeResults() {
    setLoading(true);
    setResultsError(null);

    try {
      const myVotes = await getMyVotes(poll.id);

      if (myVotes && myVotes.length > 0) {
        setHasVoted(true);
        const nextSel: Record<string, string> = {};
        for (const v of myVotes) nextSel[v.question_id] = v.option_id;
        setSelections(nextSel);
      } else {
        setHasVoted(false);
        setSelections({});
      }

      if (!active) {
        const res = await getPollResultsPublic(poll.id);
        if (res.ok) setResultsRows((res.data ?? []) as ResultsRow[]);
        else {
          setResultsRows(null);
          setResultsError(res.error || "Failed to load results.");
        }
      } else {
        setResultsRows(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMyStateAndMaybeResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll.id, active]);

  function pickOption(questionId: string, optionId: string) {
    setSelections((prev) => ({ ...prev, [questionId]: optionId }));
  }

  async function handleSubmit() {
    if (!active) return;
    if (!isComplete) return;

    setSubmitting(true);
    try {
      const answers = questions.map((q) => ({
        questionId: q.id,
        optionId: selections[q.id],
      }));

      try {
        await submitPollVotes({ pollId: poll.id, answers });
      } catch (err: any) {
        const msg = String(err?.message || err);

        if (msg === "NOT_LOGGED_IN") {
          goLogin();
          return;
        }

        if (
          msg.toLowerCase().includes("duplicate key") ||
          msg.toLowerCase().includes("already") ||
          msg.toLowerCase().includes("unique")
        ) {
          await loadMyStateAndMaybeResults();
          return;
        }

        throw err;
      }

      await loadMyStateAndMaybeResults();
    } catch (err) {
      console.error(err);
      alert("Something went wrong while submitting your vote.");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- UI helpers ----------

  function chunk<T>(arr: T[], size: number) {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  function NomineeCard({
    opt,
    selected,
    disabled,
    onClick,
    mode,
    votes,
    pct,
    totalVotes,
    isWinner,
  }: {
    opt: PollOption;
    selected: boolean;
    disabled: boolean;
    onClick: () => void;

    mode: "vote" | "voted" | "results";
    votes?: number;
    pct?: number;
    totalVotes?: number;
    isWinner?: boolean;
  }) {
    const hasImage = (opt.style === "image" && !!opt.image_url) || !!opt.image_url;

    const v = typeof votes === "number" ? votes : 0;
    const p = typeof pct === "number" ? pct : 0;

    const lift =
      mode === "results" && isWinner
        ? "transform -translate-y-2 shadow-[0_26px_90px_rgba(245,158,11,0.22)]"
        : "shadow-[0_18px_55px_rgba(0,0,0,0.55)]";

    const ring =
      mode === "vote"
        ? selected
          ? "ring-lime-400/60"
          : "ring-white/10 group-hover:ring-white/25"
        : mode === "results" && isWinner
          ? "ring-2 ring-amber-300/70"
          : "ring-white/12";

    const bottomLabel =
      mode === "vote"
        ? "VOTE"
        : mode === "voted"
          ? selected
            ? "YOUR VOTE"
            : "VOTED"
          : isWinner
            ? "WINNER"
            : "RESULT";

    const bottomBar =
      mode === "vote"
        ? selected
          ? "bg-lime-300 text-black"
          : "bg-[#D8A06B] text-black"
        : mode === "voted"
          ? selected
            ? "bg-lime-300 text-black"
            : "bg-white/10 text-white"
          : isWinner
            ? "bg-amber-300 text-black"
            : "bg-white/10 text-white";

    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={[
          "group w-full text-left outline-none",
          "focus-visible:ring-2 focus-visible:ring-lime-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40",
          disabled ? "opacity-90 cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
      >
        <div className={["overflow-hidden ring-1 transition", ring, lift].join(" ")}>
          <div className="relative aspect-[4/5] bg-black/40">
            {hasImage ? (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${opt.image_url})` }}
                />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.60),transparent_52%)]" />
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-[radial-gradient(600px_circle_at_30%_20%,rgba(255,255,255,0.10),transparent_55%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.85),rgba(0,0,0,0.30))]" />
                <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                  <div className="text-lg font-extrabold text-white/90 break-words">
                    {opt.label}
                  </div>
                </div>
              </>
            )}

            {mode === "results" ? (
              <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-3">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] text-white/80">
                      Votes
                      {typeof totalVotes === "number" ? (
                        <span className="text-white/55"> (of {totalVotes})</span>
                      ) : null}
                    </div>
                    <div className="text-lg font-extrabold text-white leading-none">{v}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-white/70">Share</div>
                    <div className="text-lg font-extrabold text-white leading-none">{p}%</div>
                  </div>
                </div>

                <div className="mt-2 h-2 w-full bg-white/10 overflow-hidden">
                  <div
                    className={isWinner ? "h-full bg-amber-300" : "h-full bg-white/35"}
                    style={{ width: `${p}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div
            className={[
              "h-14 flex items-center justify-center",
              "font-semibold tracking-[0.28em] uppercase text-sm",
              bottomBar,
            ].join(" ")}
          >
            {bottomLabel}
          </div>
        </div>

        <div className="mt-4 px-1">
          <div className="text-sm font-extrabold tracking-[0.14em] uppercase text-white">
            {opt.label}
          </div>
        </div>
      </button>
    );
  }

  function VotingGrid({
    opts,
    selectedId,
    onPick,
    disabled,
    mode,
    getVotes,
    getPct,
    getWinner,
    totalVotes,
  }: {
    opts: PollOption[];
    selectedId: string;
    onPick: (id: string) => void;
    disabled: boolean;

    mode: "vote" | "voted" | "results";
    getVotes?: (optId: string) => number;
    getPct?: (optId: string) => number;
    getWinner?: (optId: string) => boolean;
    totalVotes?: number;
  }) {
    const rows = chunk(opts, 4);

    return (
      <div className="space-y-8 min-w-0">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-12 gap-6 min-w-0">
            {row.map((opt) => (
              <div key={opt.id} className="col-span-12 sm:col-span-6 lg:col-span-3">
                <NomineeCard
                  opt={opt}
                  selected={selectedId === opt.id}
                  disabled={disabled}
                  onClick={() => onPick(opt.id)}
                  mode={mode}
                  votes={getVotes ? getVotes(opt.id) : undefined}
                  pct={getPct ? getPct(opt.id) : undefined}
                  isWinner={getWinner ? getWinner(opt.id) : false}
                  totalVotes={totalVotes}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  function TextOptionsList({
    opts,
    selectedId,
    onPick,
    disabled,
    mode,
    getVotes,
    getPct,
    getWinner,
    totalVotes,
  }: {
    opts: PollOption[];
    selectedId: string;
    onPick: (id: string) => void;
    disabled: boolean;

    mode: "vote" | "voted" | "results";
    getVotes?: (optId: string) => number;
    getPct?: (optId: string) => number;
    getWinner?: (optId: string) => boolean;
    totalVotes?: number;
  }) {
    return (
      <div className="space-y-3">
        {opts.map((opt) => {
          const selected = selectedId === opt.id;

          const v = getVotes ? getVotes(opt.id) : 0;
          const p = getPct ? getPct(opt.id) : 0;
          const isWinner = getWinner ? getWinner(opt.id) : false;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onPick(opt.id)}
              disabled={disabled}
              className={[
                "w-full text-left flex items-center gap-3",
                "border border-white/15 bg-black/20 hover:bg-black/30 hover:border-white/25 transition",
                "px-4 py-3",
                disabled ? "opacity-70 cursor-not-allowed" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "h-4 w-4 shrink-0 rounded-full border",
                  selected ? "border-lime-300 bg-lime-300/40" : "border-white/35 bg-transparent",
                ].join(" ")}
              />

              <div className="min-w-0 flex-1">
                <div className="text-sm sm:text-base font-semibold text-white break-words">
                  {opt.label}
                </div>

                {mode === "results" ? (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[11px] text-white/65">
                      <span>
                        Votes: <span className="text-white/80">{v}</span>
                        {typeof totalVotes === "number" ? (
                          <span className="text-white/40"> / {totalVotes}</span>
                        ) : null}
                      </span>
                      <span className={isWinner ? "text-amber-300 font-semibold" : ""}>
                        {p}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full bg-white/10 overflow-hidden">
                      <div
                        className={isWinner ? "h-full bg-amber-300" : "h-full bg-white/35"}
                        style={{ width: `${p}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  function OptionsRenderer({
    qid,
    opts,
    selectedId,
    disabled,
    mode,
    getVotes,
    getPct,
    getWinner,
    totalVotes,
  }: {
    qid: string;
    opts: PollOption[];
    selectedId: string;
    disabled: boolean;
    mode: "vote" | "voted" | "results";
    getVotes?: (optId: string) => number;
    getPct?: (optId: string) => number;
    getWinner?: (optId: string) => boolean;
    totalVotes?: number;
  }) {
    const imageOpts = opts.filter((o) => o.style === "image" || !!o.image_url);
    const textOpts = opts.filter((o) => !(o.style === "image" || !!o.image_url));

    return (
      <div className="space-y-6">
        {textOpts.length > 0 && (
          <TextOptionsList
            opts={textOpts}
            selectedId={selectedId}
            disabled={disabled}
            onPick={(id) => (mode === "vote" ? pickOption(qid, id) : undefined)}
            mode={mode}
            getVotes={getVotes}
            getPct={getPct}
            getWinner={getWinner}
            totalVotes={totalVotes}
          />
        )}

        {imageOpts.length > 0 && (
          <VotingGrid
            opts={imageOpts}
            selectedId={selectedId}
            disabled={disabled}
            onPick={(id) => (mode === "vote" ? pickOption(qid, id) : undefined)}
            mode={mode}
            getVotes={getVotes}
            getPct={getPct}
            getWinner={getWinner}
            totalVotes={totalVotes}
          />
        )}
      </div>
    );
  }

  // ---------- Views ----------

  function ClosedResultsView() {
    if (!resultsRows && resultsError) {
      return (
        <div className="text-sm text-white/70">
          Poll is closed, but results couldn’t load.
          <div className="mt-2 text-xs text-white/50">{resultsError}</div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {questions.map((q, qi) => {
          const opts = optionsByQuestion[q.id] ?? [];
          const total = totalsByQuestion[q.id] ?? 0;

          const getVotes = (optId: string) => (resultsMap[q.id] || {})[optId] ?? 0;
          const getPct = (optId: string) => {
            const v = getVotes(optId);
            return total > 0 ? Math.round((v / total) * 100) : 0;
          };
          const getWinner = (optId: string) => (winnersByQuestion[q.id] ?? new Set()).has(optId);

          return (
            <section key={q.id} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wide text-white/50">
                    Question {qi + 1} of {questions.length}
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white break-words mt-1">
                    {q.prompt}
                  </h3>
                </div>
                <div className="text-xs text-white/60 shrink-0">Total votes: {total}</div>
              </div>

              <OptionsRenderer
                qid={q.id}
                opts={opts}
                selectedId={selections[q.id] ?? ""}
                disabled={true}
                mode="results"
                getVotes={getVotes}
                getPct={getPct}
                getWinner={getWinner}
                totalVotes={total}
              />
            </section>
          );
        })}
      </div>
    );
  }

  function ActiveVotedView() {
    return (
      <div className="space-y-8">
        <div className="text-sm text-white/70">
          Thanks for voting ✅
          <div className="text-xs text-white/50 mt-1">Results will be visible when the poll ends.</div>
        </div>

        {questions.map((q, qi) => {
          const opts = optionsByQuestion[q.id] ?? [];
          const selectedId = selections[q.id] ?? "";

          return (
            <section key={q.id} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wide text-white/50">
                    Question {qi + 1} of {questions.length}
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white break-words mt-1">
                    {q.prompt}
                  </h3>
                </div>
              </div>

              <OptionsRenderer
                qid={q.id}
                opts={opts}
                selectedId={selectedId}
                disabled={true}
                mode="voted"
              />
            </section>
          );
        })}
      </div>
    );
  }

  // ---------- states ----------

  if (loading) return <div className="text-sm text-white/70">Loading poll…</div>;
  if (!questions.length) return <div className="text-sm text-white/70">This poll has no questions yet.</div>;

  if (!active) return <ClosedResultsView />;
  if (hasVoted) return <ActiveVotedView />;

  const selectedForCurrent = currentQuestion ? selections[currentQuestion.id] : "";

  return (
    <div className="space-y-6">
      {currentQuestion && (
        <div className="space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-white/50">
              Question {step + 1} of {totalQuestions}
            </div>
            <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white break-words">
              {currentQuestion.prompt}
            </h3>
          </div>

          <OptionsRenderer
            qid={currentQuestion.id}
            opts={currentOptions}
            selectedId={selectedForCurrent}
            disabled={submitting}
            mode="vote"
          />

          <div className="mt-6 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || submitting}
              className="border border-white/20 px-4 py-2 text-xs hover:bg-white/5 disabled:opacity-50"
            >
              ← Back
            </button>

            {step < totalQuestions - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(totalQuestions - 1, s + 1))}
                disabled={!selectedForCurrent || submitting}
                className="border border-white/20 px-4 py-2 text-xs hover:bg-white/5 disabled:opacity-50"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isComplete || submitting}
                className="bg-lime-300 px-5 py-2.5 text-xs font-semibold text-black disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Confirm Vote"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
