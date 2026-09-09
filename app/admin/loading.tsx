export default function AdminLoading() {
  return (
    <div
      role="status"
      aria-label="Loading admin workspace"
      className="min-h-screen bg-[#0d1118] p-6 text-slate-300"
    >
      <div className="mx-auto max-w-6xl">
        <p className="mb-8">Loading workspace…</p>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-32 rounded-2xl bg-[#1b2533]" />
          ))}
        </div>
        <div className="mt-6 h-80 rounded-2xl bg-[#1b2533]" />
      </div>
    </div>
  );
}
