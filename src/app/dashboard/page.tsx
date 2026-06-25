import { libraryListItems } from "@/data/library";
import { DashboardView } from "@/components/dashboard/DashboardView";

/**
 * The dashboard renders on the server so it can ship the lightweight
 * `LibraryListItem` projection to the client. Recommendations are linked
 * straight to `/library/[slug]`, where the hand-authored translations live.
 */
export default function DashboardPage() {
  return <DashboardView libraryItems={libraryListItems} />;
}
