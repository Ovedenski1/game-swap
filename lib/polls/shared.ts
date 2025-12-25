export type PollStatus = "draft" | "published" | "archived";

export type PollListItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  hero_image_url: string | null;
  card_image_url: string | null;
  status: PollStatus;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

export type PollQuestion = {
  id: string;
  poll_id: string;
  prompt: string;
  sort_order: number;
};

export type PollOption = {
  id: string;
  poll_id: string;
  question_id: string;
  label: string;
  image_url: string | null;
  style: "text" | "image";
  sort_order: number;
};

export type PollDetail = PollListItem & {
  questions: PollQuestion[];
  options: PollOption[];
};

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
