// app/admin/stories/[id]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StoryBuilderClient, { StoryBlock } from "@/components/StoryEditor";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
};

export default async function EditStoryPage({ params }: PageProps) {
  const resolved = params instanceof Promise ? await params : params;
  const { id } = resolved;

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
    `,
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("EditStoryPage error", error);
    notFound();
  }

  let blocks: StoryBlock[] | null = null;

  if (data.content_blocks) {
    try {
      if (Array.isArray(data.content_blocks)) {
        blocks = data.content_blocks as StoryBlock[];
      } else {
        blocks = JSON.parse(data.content_blocks as any) as StoryBlock[];
      }
    } catch (e) {
      console.error("Failed to parse content_blocks for edit page", e);
      blocks = null;
    }
  }

  return (
    <StoryBuilderClient
      mode="edit"
      existingId={String(data.id)}
      initialTitle={(data.title as string) ?? ""}
      initialSubtitle={(data.subtitle as string | null) ?? ""}
      initialHeroImage={(data.image_url as string | null) ?? ""}
      initialAuthorName={(data.author_name as string | null) ?? null}
      initialAuthorRole={(data.author_role as string | null) ?? null}
      initialAuthorAvatarUrl={
        (data.author_avatar_url as string | null) ?? null
      }
      initialReviewedBy={(data.reviewed_by as string | null) ?? null}
      initialSlug={(data.slug as string | null) ?? null}
      initialMetaTitle={(data.meta_title as string | null) ?? null}
      initialMetaDescription={
        (data.meta_description as string | null) ?? null
      }
      initialBlocks={blocks}
    />
  );
}
