// app/admin/polls/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  adminGetPolls,
  adminDeletePoll,
  adminSetPollStatus,
  type PollStatus,
} from "@/lib/actions/admin-polls";

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2",
        "rounded-full px-3 py-1 text-[11px] uppercase tracking-wide",
        "border border-border/40 text-text-soft",
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-bronze" />
      {children}
    </span>
  );
}

const outlineBtn =
  "inline-flex items-center justify-center " +
  "bg-transparent text-foreground border border-border/40 " +
  "hover:border-bronze/45 hover:bg-transparent " +
  "shadow-[0_0_0_1px_rgba(236,167,44,0)] hover:shadow-[0_0_0_1px_rgba(236,167,44,0.18)] " +
  "focus-visible:ring-2 focus-visible:ring-bronze/45 " +
  "rounded-full px-3 py-1.5 text-xs";

const surfaceBtn =
  "inline-flex items-center justify-center " +
  "bg-surface text-foreground border border-border/40 " +
  "hover:border-bronze/45 " +
  "shadow-[0_10px_30px_rgba(0,0,0,0.25)] " +
  "focus-visible:ring-2 focus-visible:ring-bronze/45 " +
  "rounded-full px-4 py-2 text-xs";

const dangerBtn =
  "inline-flex items-center justify-center " +
  "bg-transparent text-foreground border border-paprika/55 " +
  "hover:border-paprika/80 hover:bg-transparent " +
  "focus-visible:ring-2 focus-visible:ring-paprika/45 " +
  "rounded-full px-3 py-1.5 text-xs";

export default async function AdminPollsPage() {
  const supabase = await createClient();

  // 1) auth
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) redirect("/");

  // 2) admin check
  const { data: dbUser } = await supabase
    .from("users")
    .select("id, is_admin")
    .eq("id", auth.user.id)
    .single();

  const isAdmin = dbUser?.is_admin || auth.user.user_metadata?.is_admin;
  if (!isAdmin) redirect("/");

  // 3) data
  const polls = await adminGetPolls();

  async function deleteOne(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    if (!id) return;
    await adminDeletePoll(id);
  }

  async function setStatus(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    const status = String(formData.get("status") || "") as PollStatus;
    if (!id || !status) return;
    await adminSetPollStatus(id, status);
  }

  return (
    <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-4 py-8">
      {/* Top controls row */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <Link href="/admin" className={outlineBtn}>
          ← Back to dashboard
        </Link>

        <Link href="/admin/polls/new" className={surfaceBtn}>
          + New poll
        </Link>
      </div>

      {/* Header “Poll Editor” style */}
      <div className="text-center">
        <div className="mx-auto mb-3 h-[2px] w-16 rounded-full bg-bronze/80" />
        <h1
          className={[
            "text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase",
            "tracking-tight text-foreground leading-none",
            "[text-shadow:0_2px_0_rgba(0,0,0,0.35)]",
          ].join(" ")}
        >
          Admin Polls
        </h1>
        <p className="mt-3 text-sm text-text-muted">Create and manage polls.</p>
      </div>

      <div className="mt-8 h-px w-full bg-border/40" />

      {/* List */}
      <div className="mt-6 space-y-4">
        {polls.length === 0 ? (
          <div className="rounded-2xl border border-border/30 p-8 text-center text-text-muted">
            No polls yet.
          </div>
        ) : (
          polls.map((p) => {
            const isArchived = p.status === "archived";
            const nextStatus: PollStatus = isArchived ? "published" : "archived";
            const statusLabel = isArchived ? "Unarchive" : "Archive";

            return (
              <div
                key={p.id}
                className={[
                  "rounded-2xl bg-surface p-4 sm:p-5",
                  "border border-border/30",
                  "hover:border-bronze/35 transition-colors",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge>
                        {String(p.status)} • {p.slug}
                      </Badge>

                      {p.ends_at ? (
                        <span className="text-[11px] text-text-muted">
                          Ends: {new Date(p.ends_at).toLocaleString()}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 text-lg font-semibold text-foreground truncate">
                      {p.title}
                    </div>
                  </div>

                  {/* Actions (keep working routes + server forms) */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/polls/${p.slug}`}
                      target="_blank"
                      className={outlineBtn}
                    >
                      View
                    </Link>

                    {/* ✅ IMPORTANT: this is your working edit route */}
                    <Link href={`/admin/polls/${p.id}`} className={outlineBtn}>
                      Edit
                    </Link>

                    {/* Archive / Unarchive */}
                    <form action={setStatus}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="status" value={nextStatus} />
                      <button type="submit" className={outlineBtn}>
                        {statusLabel}
                      </button>
                    </form>

                    {/* Delete */}
                    <form action={deleteOne}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className={dangerBtn}>
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
