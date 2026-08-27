import Image from "next/image";

export function Hero() {
  return (
    <section className="hero-shell" aria-label="Tiger Store">
      <div className="mx-auto max-w-[1180px] px-4 py-3 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-white/15">
          <Image src="/hero/tiger-store-main.webp" alt="Tiger Store digital subscriptions" fill priority sizes="(min-width: 1180px) 1180px, 100vw" className="object-cover" />
        </div>
      </div>
    </section>
  );
}
