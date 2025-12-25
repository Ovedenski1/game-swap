// app/admin/stories/[id]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StoryBuilderClient, { type StoryBlock } from "@/components/StoryEditor";

type PageProps = {
  params: { id: string };
};

function safeParseBlocks(value: unknown): StoryBlock[] | null {
  if (!value) return null;

  if (Array.isArray(value)) {
    return value as StoryBlock[];
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as StoryBlock[]) : null;
    } catch {
      return null;
    }
  }

  return null;
}

export default async function EditStoryPage({ params }: PageProps) {
  const { id } = params;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("top_stories")
    .select(
      `
        id,
        title,
        subtitle,
        image_url,
        slug,
        meta_title,
        meta_description,
        content_blocks,
        author_name,
        author_role,
        author_avatar_url,
        reviewed_by
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    console.error("EditStoryPage error", error);
    notFound();
  }

  const blocks = safeParseBlocks(data.content_blocks);

  return (
    <StoryBuilderClient
      mode="edit"
      existingId={String(data.id)}
      initialTitle={data.title ?? ""}
      initialSubtitle={data.subtitle ?? ""}
      initialHeroImage={data.image_url ?? ""}
      initialAuthorName={data.author_name ?? null}
      initialAuthorRole={data.author_role ?? null}
      initialAuthorAvatarUrl={data.author_avatar_url ?? null}
      initialReviewedBy={data.reviewed_by ?? null}
      initialSlug={data.slug ?? null}
      initialMetaTitle={data.meta_title ?? null}
      initialMetaDescription={data.meta_description ?? null}
      initialBlocks={blocks}
    />
  );
}
