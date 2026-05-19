import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-center">
      <section className="glass-panel max-w-md rounded-[1.5rem] p-8">
        <h1 className="text-4xl font-extrabold text-white">الصفحة غير موجودة</h1>
        <p className="mt-3 text-white/62">الرابط غير صحيح أو المنتج غير متوفر حاليا.</p>
        <Button asChild className="mt-6">
          <Link href="/">العودة للمتجر</Link>
        </Button>
      </section>
    </main>
  );
}
