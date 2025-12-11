// app/admin/ratings/new/page.tsx
import RatingEditor from "@/components/RatingEditor";

export default function NewRatingPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-4 py-8 text-white">
      <RatingEditor mode="create" />
    </div>
  );
}
