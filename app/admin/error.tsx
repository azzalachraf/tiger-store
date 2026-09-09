"use client";
import Link from "next/link";
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#0d1118] px-5 py-20 text-white">
      <section className="mx-auto max-w-lg rounded-2xl border border-white/15 bg-[#151b25] p-8">
        <h1 className="text-2xl font-bold">This view could not load</h1>
        <p className="my-4 leading-7 text-slate-300">
          Check your connection and try again. If an action was interrupted,
          refresh the record before retrying it.
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="rounded-xl bg-orange-400 px-5 py-3 font-bold text-black"
          >
            Try again
          </button>
          <Link
            href="/admin"
            className="rounded-xl border border-white/20 px-5 py-3"
          >
            Overview
          </Link>
        </div>
      </section>
    </div>
  );
}
