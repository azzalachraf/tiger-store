import { ShieldX } from "lucide-react";

export default function AccessDeniedPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#080b10] p-6 text-center text-white">
      <section className="max-w-md rounded-3xl border border-red-500/20 bg-white/[0.03] p-8 shadow-2xl">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-red-500/10"><ShieldX className="h-8 w-8 text-red-300" /></div>
        <h1 className="text-2xl font-black">Access denied</h1>
        <p className="mt-3 leading-7 text-white/55">This network has been blocked from accessing Tiger Store. Contact support if you believe this is a mistake.</p>
      </section>
    </main>
  );
}
