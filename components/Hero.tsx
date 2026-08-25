import Image from "next/image";

export function Hero() {
  return (
    <section className="border-b border-white/10 bg-[#111]" aria-label="Tiger Store digital subscriptions">
      <div className="mx-auto max-w-[1440px] px-3 pb-3 pt-1 sm:px-5 sm:pb-5 lg:px-8 lg:pb-6">
        <div className="overflow-hidden rounded-md border border-white/10 bg-[#f7f0e8] shadow-[0_22px_60px_rgba(0,0,0,0.3)]">
          <div className="relative aspect-[1672/941]">
            <Image
              src="/hero/tiger-store-hero.webp"
              alt="Tiger Store — اشتراكات رقمية في مكان واحد، featuring AI, design, learning, and software subscriptions"
              fill
              priority
              sizes="(min-width: 1440px) 1440px, (min-width: 1024px) calc(100vw - 64px), (min-width: 640px) calc(100vw - 40px), calc(100vw - 24px)"
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
