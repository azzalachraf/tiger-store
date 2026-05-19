import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Banners",
};

export default function AdminBannersPage() {
  return (
    <AdminShell title="البنرات" description="إدارة مستقبلية لبطاقات العروض والبنرات في الصفحة الرئيسية.">
      <div className="grid gap-4 md:grid-cols-2">
        {["البطاقة الترويجية 1", "البطاقة الترويجية 2", "البطاقة الترويجية 3", "البطاقة الترويجية 4"].map((banner) => (
          <div key={banner} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <h2 className="font-extrabold text-white">{banner}</h2>
            <p className="mt-2 leading-7 text-white/58">Placeholder لإدارة النص، الرابط، والترتيب لاحقا.</p>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
