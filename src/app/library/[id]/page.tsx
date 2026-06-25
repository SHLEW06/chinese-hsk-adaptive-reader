import Link from "next/link";
import { ContentReader } from "@/components/reader/ContentReader";
import { LibraryDetail } from "@/components/library/LibraryDetail";
import { starterContent } from "@/data/starterContent";
import { getLibraryItem, libraryItems } from "@/data/library";

export const dynamicParams = false;

export function generateStaticParams() {
  // Cards use slugs, while IDs remain supported for older links. Both must be
  // emitted because this project is configured for static export.
  const fromLibrary = libraryItems.flatMap((item) => [
    { id: item.id },
    { id: item.slug },
  ]);
  const fromLegacy = starterContent.map((item) => ({ id: item.id }));
  return Array.from(new Map([...fromLibrary, ...fromLegacy].map((item) => [item.id, item])).values());
}

export default function ContentDetailPage({ params }: { params: { id: string } }) {
  // Resolve static library content first. This route must never wait for auth,
  // Firestore, or imported-content storage before rendering a reading.
  const libraryItem = getLibraryItem(params.id);
  if (libraryItem) {
    return <LibraryDetail item={libraryItem} />;
  }

  const legacy = starterContent.find((content) => content.id === params.id) || null;
  if (legacy) {
    return <ContentReader text={legacy.text} title={legacy.title} contentId={legacy.id} />;
  }

  return (
    <div className="py-16 text-center text-sm text-muted">
      Content not found.{" "}
      <Link href="/library" className="text-seal">
        Back to library
      </Link>
    </div>
  );
}
