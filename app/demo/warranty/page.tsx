import { DemoWarranty } from "@/app/demo/warranty/DemoWarranty";

export const metadata = { title: "Tiger Store training warranty", robots: { index: false, follow: false } };

export default async function DemoWarrantyPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const plan = (await searchParams).plan;
  const months = ["1", "2", "3", "6", "12"].includes(plan ?? "") ? plan! : "1";
  return <DemoWarranty months={months} />;
}
