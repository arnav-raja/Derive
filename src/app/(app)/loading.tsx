/*
 * Shown inside the app frame while a page's data loads: the shape of a page
 * header, a row of figures and two cards, so nothing jumps when it arrives.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10" aria-busy="true">
      <p className="sr-only" role="status">
        Loading
      </p>
      <div aria-hidden="true" className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-9 w-64 max-w-full" />
          <div className="skeleton h-4 w-full max-w-xl" />
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-rule bg-rule lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-3 bg-surface p-5">
              <div className="skeleton h-4 w-28" />
              <div className="skeleton h-8 w-16" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex flex-col gap-4 rounded-lg border border-rule bg-surface p-6">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
            <div className="skeleton h-32 w-full" />
          </div>
          <div className="flex flex-col gap-4 rounded-lg border border-rule bg-surface p-6">
            <div className="skeleton h-5 w-28" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}
