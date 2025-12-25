// lib/polls-utils.ts

export type PollStatus = "draft" | "published" | "archived";

export function isPollActive(p: {
  status: PollStatus;
  starts_at: string | null;
  ends_at: string | null;
}) {
  if (p.status !== "published") return false;

  const now = Date.now();
  const startsOk = !p.starts_at || new Date(p.starts_at).getTime() <= now;
  const endsOk = !p.ends_at || new Date(p.ends_at).getTime() > now;

  return startsOk && endsOk;
}
