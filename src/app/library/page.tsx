import { LibraryBrowser } from "@/components/library/LibraryBrowser";
import { libraryListItems } from "@/data/library";

/**
 * Keep the expanded JSON corpus on the server for the browse route. The
 * client receives only small card records; a detail route carries one full
 * reading when the learner opens it.
 */
export default function LibraryPage() {
  return <LibraryBrowser staticItems={libraryListItems} />;
}
