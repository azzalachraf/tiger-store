import Image from "next/image";
import { LockKeyhole } from "lucide-react";
import { loginAction } from "@/app/admin/login/actions";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Admin Login",
};

type AdminLoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const { error, next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-3 py-10 sm:px-5">
      <section className="glass-panel w-full rounded-2xl p-6 sm:p-8">
        <Image
          src="/logo/tiger-store.webp"
          alt="Tiger Store"
          width={72}
          height={72}
          className="mx-auto mb-5 rounded-2xl"
          priority
        />
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-tiger-ember" />
        <h1 className="text-center text-3xl font-extrabold text-white">تسجيل دخول الإدارة</h1>
        <p className="mt-3 text-center leading-7 text-white/60">
          هذه المنطقة خاصة بالمسؤول فقط. بيانات الدخول تقرأ من متغيرات البيئة.
        </p>

        {error ? (
          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error === "config"
              ? "لم يتم ضبط ADMIN_EMAIL و ADMIN_PASSWORD بعد."
              : "البريد الإلكتروني أو كلمة المرور غير صحيحة."}
          </div>
        ) : null}

        <form action={loginAction} className="mt-6 grid gap-4">
          <input type="hidden" name="next" value={next ?? "/admin"} />
          <label className="grid gap-2 text-sm font-bold text-white">
            البريد الإلكتروني
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="min-h-12 rounded-xl border border-white/10 bg-black px-4 text-white outline-none focus:border-tiger-ember"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-white">
            كلمة المرور
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="min-h-12 rounded-xl border border-white/10 bg-black px-4 text-white outline-none focus:border-tiger-ember"
            />
          </label>
          <Button type="submit" className="w-full">دخول الإدارة</Button>
        </form>
      </section>
    </main>
  );
}
