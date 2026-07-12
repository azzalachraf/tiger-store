export function StoreLoading() {
  return (
    <main className="store-shell min-h-screen px-3 py-6 sm:px-5 lg:px-8" aria-busy="true" aria-label="Loading page">
      <div className="mx-auto max-w-[1440px]">
        <div className="premium-card rounded-md p-5 sm:p-7">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton mt-4 h-10 w-full max-w-xl" />
          <div className="skeleton mt-3 h-4 w-full max-w-2xl" />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="rounded-md border border-white/10 bg-white/[0.045] p-3">
              <div className="skeleton aspect-[4/5] w-full" />
              <div className="skeleton mt-3 h-4 w-3/4" />
              <div className="skeleton mt-2 h-4 w-1/2" />
              <div className="skeleton mt-4 h-10 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
