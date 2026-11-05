/*
 * The lesson workspace while a phase loads: its top bar and a column of
 * reading, so the frame stays put between phases.
 */
export default function Loading() {
  return (
    <div className="min-h-dvh bg-paper" aria-busy="true">
      <p className="sr-only" role="status">
        Loading the phase
      </p>
      <div aria-hidden="true">
        <div className="flex h-14 items-center gap-3 border-b border-rule bg-surface px-3">
          <div className="skeleton size-8" />
          <div className="skeleton size-8" />
          <div className="flex flex-col gap-1.5">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-4 w-40" />
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10 sm:px-8">
          <div className="skeleton size-11" />
          <div className="skeleton h-9 w-72 max-w-full" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-11/12" />
          <div className="skeleton h-4 w-4/5" />
          <div className="skeleton mt-4 h-48 w-full" />
        </div>
      </div>
    </div>
  );
}
