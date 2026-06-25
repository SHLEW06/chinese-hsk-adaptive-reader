export default function LibraryReadingLoading() {
  return (
    <div className="animate-pulse">
      <div className="reading-column mb-6 space-y-3">
        <div className="h-5 w-24 rounded-full bg-paper-2" />
        <div className="h-8 w-2/3 rounded bg-paper-2" />
        <div className="h-4 w-full rounded bg-paper-2" />
      </div>
      <div className="reading-column rounded-2xl border border-line bg-surface px-5 py-10 sm:px-10">
        <div className="space-y-6">
          <div className="h-6 w-full rounded bg-paper-2" />
          <div className="h-6 w-11/12 rounded bg-paper-2" />
          <div className="h-6 w-4/5 rounded bg-paper-2" />
        </div>
      </div>
    </div>
  );
}
